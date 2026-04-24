import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { LockedBlockView } from "./LockedBlockView";
import type { PermissionPolicy, PolicyContext } from "../../core/policy";
import type { EditorEventBus } from "../../core/events";
import type { AuditLog } from "../../drivers/audit-log";
import type { EditorMode } from "../../core/types";

export type LockMode = "locked" | "readonly" | "conditional";

export interface LockedBlockAttrs {
  mode: LockMode;
  reason: string | null;
  condition: string | null;
  lockedBy: string | null;
}

export interface LockedBlockOptions {
  policy?: PermissionPolicy;
  getPolicyContext?: () => PolicyContext;
  events?: EditorEventBus;
  audit?: AuditLog;
  /**
   * Editor-level mode. Mirrored into `editor.storage.lockedBlock.editorMode`
   * so the NodeView (and any host UI) can render template- vs document-
   * specific affordances without re-reading the full context.
   */
  editorMode?: EditorMode;
}

export interface LockedBlockStorage {
  editorMode: EditorMode;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lockedBlock: {
      setLockedBlock: (attrs?: Partial<LockedBlockAttrs>) => ReturnType;
      unsetLockedBlock: () => ReturnType;
      updateLockedBlock: (attrs: Partial<LockedBlockAttrs>) => ReturnType;
    };
  }
}

function descriptorFrom(attrs: Record<string, unknown>): LockedBlockAttrs {
  return {
    mode: (attrs.mode as LockMode) ?? "locked",
    reason: (attrs.reason as string | null) ?? null,
    condition: (attrs.condition as string | null) ?? null,
    lockedBy: (attrs.lockedBy as string | null) ?? null,
  };
}

import { findLockedAncestor } from "./utils";

/**
 * A container node whose content is conditionally editable.
 *
 * The schema carries *intent* (mode + reason + condition). The editor
 * enforces the rule through the accompanying `LockGuard` transaction
 * filter. Mode transitions and wrap/unwrap go through the host
 * `PermissionPolicy` so regulated systems can require a signature or
 * deny the change outright.
 */
export const LockedBlock = Node.create<LockedBlockOptions>({
  name: "lockedBlock",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addOptions() {
    return {};
  },

  addStorage(): LockedBlockStorage {
    return { editorMode: this.options.editorMode ?? "document" };
  },

  addAttributes() {
    return {
      mode: {
        default: "locked" as LockMode,
        parseHTML: (el) =>
          (el.getAttribute("data-lock-mode") as LockMode) ?? "locked",
        renderHTML: (attrs) => ({ "data-lock-mode": attrs.mode }),
      },
      reason: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-lock-reason"),
        renderHTML: (attrs) =>
          attrs.reason ? { "data-lock-reason": attrs.reason } : {},
      },
      condition: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-lock-condition"),
        renderHTML: (attrs) =>
          attrs.condition ? { "data-lock-condition": attrs.condition } : {},
      },
      lockedBy: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-locked-by"),
        renderHTML: (attrs) =>
          attrs.lockedBy ? { "data-locked-by": attrs.lockedBy } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='locked-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "locked-block" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LockedBlockView);
  },

  addCommands() {
    const options = this.options;

    const denied = (action: string, reason?: string) => {
      options.events?.emit("permission.denied", { action, reason });
      return false;
    };

    const getCtx = (): PolicyContext | null => options.getPolicyContext?.() ?? null;

    return {
      setLockedBlock:
        (attrs = {}) =>
        ({ commands, state }) => {
          const target: LockedBlockAttrs = {
            mode: "locked",
            reason: null,
            condition: null,
            lockedBy: null,
            ...attrs,
          } as LockedBlockAttrs;
          const ctx = getCtx();
          if (options.policy && ctx) {
            const decision = options.policy.canSetLock({ ...ctx, target });
            if (!decision.allowed) {
              return denied("block.set-lock", decision.reason);
            }
          }
          const { selection } = state;
          const pos = selection.from;
          const ok = commands.wrapIn(this.name, target);
          if (ok) {
            options.events?.emit("block.locked", {
              mode: target.mode,
              reason: target.reason,
              condition: target.condition,
              pos,
            });
            options.audit?.record({
              type: "block.locked",
              at: Date.now(),
              actor: ctx ? { id: ctx.user.id, name: ctx.user.name } : { id: "?", name: "?" },
              documentId: ctx?.documentId ?? "?",
              summary: `Locked block (${target.mode})`,
              payload: target,
            });
          }
          return ok;
        },

      unsetLockedBlock:
        () =>
        ({ commands, state }) => {
          const surrounding = findLockedAncestor(state, state.selection.from);
          if (!surrounding) return false;
          const ctx = getCtx();
          const target = descriptorFrom(surrounding.node.attrs);
          if (options.policy && ctx) {
            const decision = options.policy.canUnlock({ ...ctx, target });
            if (!decision.allowed) {
              return denied("block.unlock", decision.reason);
            }
          }
          const ok = commands.lift(this.name);
          if (ok) {
            options.events?.emit("block.unlocked", { pos: surrounding.pos });
            options.audit?.record({
              type: "block.unlocked",
              at: Date.now(),
              actor: ctx ? { id: ctx.user.id, name: ctx.user.name } : { id: "?", name: "?" },
              documentId: ctx?.documentId ?? "?",
              summary: "Unlocked block",
              payload: target,
            });
          }
          return ok;
        },

      updateLockedBlock:
        (attrs) =>
        ({ commands, state }) => {
          const surrounding = findLockedAncestor(state, state.selection.from);
          if (!surrounding) return false;
          const ctx = getCtx();
          const current = descriptorFrom(surrounding.node.attrs);
          const next: LockedBlockAttrs = { ...current, ...attrs };
          if (options.policy && ctx && attrs.mode && attrs.mode !== current.mode) {
            const decision = options.policy.canChangeLockMode({
              ...ctx,
              from: current.mode,
              to: attrs.mode,
              target: next,
            });
            if (!decision.allowed) {
              return denied("block.change-mode", decision.reason);
            }
          }
          const ok = commands.updateAttributes(this.name, attrs);
          if (ok) {
            if (attrs.mode && attrs.mode !== current.mode) {
              options.events?.emit("block.mode.changed", {
                from: current.mode,
                to: attrs.mode,
                pos: surrounding.pos,
              });
              options.audit?.record({
                type: "block.mode.changed",
                at: Date.now(),
                actor: ctx ? { id: ctx.user.id, name: ctx.user.name } : { id: "?", name: "?" },
                documentId: ctx?.documentId ?? "?",
                summary: `Lock mode ${current.mode} → ${attrs.mode}`,
                payload: { before: current, after: next },
              });
            }
          }
          return ok;
        },
    };
  },
});
