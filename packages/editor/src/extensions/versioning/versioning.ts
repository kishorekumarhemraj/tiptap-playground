import { Extension } from "@tiptap/core";
import type { JSONContent } from "@tiptap/react";
import {
  memoryVersionStore,
  type VersionAuthor,
  type VersionSnapshot,
  type VersionStore,
} from "../../drivers/version-store";
import { TEMPLATE_GUARD_BYPASS_META } from "../template-guard/TemplateStructureGuard";
import { TRACK_CHANGES_SUPPRESS_META } from "../track-changes/trackChanges";
import type {
  PermissionPolicy,
  PolicyContext,
} from "../../core/policy";
import type { EditorEventBus } from "../../core/events";
import type { AuditLog } from "../../drivers/audit-log";
import type {
  Signature,
  SignatureCeremony,
} from "../../drivers/signature-ceremony";

export interface VersioningOptions {
  store: VersionStore;
  author: VersionAuthor;
  policy?: PermissionPolicy;
  getPolicyContext?: () => PolicyContext;
  events?: EditorEventBus;
  audit?: AuditLog;
  signatures?: SignatureCeremony;
}

export interface VersioningStorage {
  store: VersionStore;
  subscribe: (listener: (snapshots: VersionSnapshot[]) => void) => () => void;
  list: () => VersionSnapshot[] | Promise<VersionSnapshot[]>;
}

declare module "@tiptap/core" {
  interface Storage {
    versioning: VersioningStorage;
  }
  interface Commands<ReturnType> {
    versioning: {
      saveVersion: (label?: string) => ReturnType;
      restoreVersion: (id: string) => ReturnType;
      deleteVersion: (id: string) => ReturnType;
    };
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `v_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

async function listSync(store: VersionStore): Promise<VersionSnapshot[]> {
  return Promise.resolve(store.list());
}

export const Versioning = Extension.create<VersioningOptions, VersioningStorage>({
  name: "versioning",

  addOptions() {
    return {
      store: memoryVersionStore(),
      author: { id: "anonymous", name: "Anonymous" },
      policy: undefined,
      getPolicyContext: undefined,
      events: undefined,
      audit: undefined,
      signatures: undefined,
    };
  },

  addStorage() {
    const listeners = new Set<(snapshots: VersionSnapshot[]) => void>();
    const store = this.options.store;

    // If the store supports its own subscription, mirror it into our
    // listener set - that way HTTP-backed stores can push updates
    // into every subscriber without polling.
    store.subscribe?.((snapshots) => {
      for (const l of listeners) l(snapshots);
    });

    const notify = async () => {
      const snapshots = await listSync(store);
      for (const l of listeners) l(snapshots);
    };

    return {
      store,
      subscribe(listener) {
        listeners.add(listener);
        // Seed subscriber with current state.
        void listSync(store).then((snapshots) => listener(snapshots));
        return () => listeners.delete(listener);
      },
      list: () => store.list(),
      _notify: notify,
    } as VersioningStorage & { _notify: () => Promise<void> };
  },

  addCommands() {
    const options = this.options;

    const denyTo = (action: string, reason?: string) => {
      options.events?.emit("permission.denied", { action, reason });
      return false;
    };

    return {
      saveVersion:
        (label) =>
        ({ editor }) => {
          const ctx = options.getPolicyContext?.();
          let signature: Signature | undefined;
          if (options.policy && ctx) {
            const decision = options.policy.canSaveVersion(ctx);
            if (!decision.allowed) {
              return denyTo("version.save", decision.reason);
            }
            if (decision.requiresSignature && options.signatures) {
              // Signing is async - we fire it and return; the caller
              // doesn't wait because TipTap commands are sync. In
              // practice hosts that need strict gating should call a
              // host-side helper that awaits `sign()` *then* runs the
              // command.
              void options.signatures
                .sign({
                  action: "version.save",
                  reason: label ?? "Save version",
                  documentId: ctx.documentId,
                  user: ctx.user,
                })
                .then((sig) => {
                  if (!sig) return;
                  signature = sig;
                });
            }
          }

          const snapshot: VersionSnapshot = {
            id: makeId(),
            label: label?.trim() || `Snapshot ${new Date().toLocaleString()}`,
            at: Date.now(),
            by: options.author,
            json: editor.getJSON() as JSONContent,
            metadata: signature ? { signature } : undefined,
          };
          void Promise.resolve(options.store.put(snapshot)).then(() => {
            (
              editor.storage.versioning as VersioningStorage & {
                _notify: () => Promise<void>;
              }
            )._notify();
            options.events?.emit("version.saved", { snapshot, signature });
            options.audit?.record({
              type: "version.saved",
              at: Date.now(),
              actor: ctx
                ? { id: ctx.user.id, name: ctx.user.name }
                : { id: "?", name: "?" },
              documentId: ctx?.documentId ?? "?",
              summary: `Saved version "${snapshot.label}"`,
              payload: { id: snapshot.id, label: snapshot.label },
              signature,
            });
          });
          return true;
        },

      restoreVersion:
        (id) =>
        ({ editor }) => {
          const ctx = options.getPolicyContext?.();
          if (options.policy && ctx) {
            const decision = options.policy.canRestoreVersion({
              ...ctx,
              snapshotId: id,
            });
            if (!decision.allowed) {
              return denyTo("version.restore", decision.reason);
            }
          }
          // Stores can be async; we resolve eagerly but optimistically
          // accept the common (synchronous) localStorage case.
          const maybe = options.store.get(id);
          const apply = (snapshot: VersionSnapshot | null) => {
            if (!snapshot) return false;
            // Restore replaces the entire doc body, which would trip
            // the template structure guard in document mode. Restore
            // is a privileged operation — already gated by
            // `canRestoreVersion` above — so we mark the transaction
            // with the bypass meta and dispatch directly.
            const { state, view, schema } = editor;
            const restored = schema.nodeFromJSON(snapshot.json);
            const tr = state.tr.replaceWith(
              0,
              state.doc.content.size,
              restored.content,
            );
            // Bypass structural guard (already policy-gated above) and
            // suppress track-changes so restored content is not wrapped
            // in insertion marks, which would corrupt the snapshot.
            tr.setMeta(TEMPLATE_GUARD_BYPASS_META, true);
            tr.setMeta(TRACK_CHANGES_SUPPRESS_META, true);
            view.dispatch(tr);
            options.events?.emit("version.restored", { snapshot });
            options.audit?.record({
              type: "version.restored",
              at: Date.now(),
              actor: ctx
                ? { id: ctx.user.id, name: ctx.user.name }
                : { id: "?", name: "?" },
              documentId: ctx?.documentId ?? "?",
              summary: `Restored version "${snapshot.label}"`,
              payload: { id: snapshot.id, label: snapshot.label },
            });
            return true;
          };
          if (maybe instanceof Promise) {
            void maybe.then(apply);
            return true;
          }
          return apply(maybe);
        },

      deleteVersion:
        (id) =>
        ({ editor }) => {
          const ctx = options.getPolicyContext?.();
          if (options.policy && ctx) {
            const decision = options.policy.canDeleteVersion({
              ...ctx,
              snapshotId: id,
            });
            if (!decision.allowed) {
              return denyTo("version.delete", decision.reason);
            }
          }
          void Promise.resolve(options.store.remove(id)).then(() => {
            (
              editor.storage.versioning as VersioningStorage & {
                _notify: () => Promise<void>;
              }
            )._notify();
            options.events?.emit("version.deleted", { id });
            options.audit?.record({
              type: "version.deleted",
              at: Date.now(),
              actor: ctx
                ? { id: ctx.user.id, name: ctx.user.name }
                : { id: "?", name: "?" },
              documentId: ctx?.documentId ?? "?",
              summary: `Deleted version ${id}`,
              payload: { id },
            });
          });
          return true;
        },
    };
  },
});
