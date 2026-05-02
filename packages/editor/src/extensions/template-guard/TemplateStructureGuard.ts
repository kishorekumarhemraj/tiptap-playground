import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { PermissionPolicy, PolicyContext } from "../../core/policy";
import type { EditorEventBus } from "../../core/events";
import type { AuditLog } from "../../drivers/audit-log";
import type { EditorMode } from "../../core/types";
import {
  blockDescriptorOf,
  evaluateEditability,
  findEnclosedFrame,
} from "./utils";

export interface TemplateStructureGuardOptions {
  policy?: PermissionPolicy;
  getPolicyContext?: () => PolicyContext;
  events?: EditorEventBus;
  audit?: AuditLog;
  /**
   * Editor-level mode. The guard enforces structural rules in
   * `"document"` mode. In `"template"` mode the guard is inactive
   * unless `readOnly` is also true, in which case all doc changes
   * are blocked (programmatic commands included).
   */
  editorMode?: EditorMode;
  /**
   * When true the editor is read-only regardless of mode. The guard
   * blocks all document-changing transactions (except those carrying
   * `TEMPLATE_GUARD_BYPASS_META`) to prevent programmatic writes
   * that bypass the TipTap `editable: false` prop.
   */
  readOnly?: boolean;
}

export const TEMPLATE_GUARD_BYPASS_META = "templateGuardBypass";

const guardPluginKey = new PluginKey("templateStructureGuard");

/**
 * Transaction filter that enforces the template's structural rules
 * in document mode.
 *
 * Allowed in document mode:
 *   1. Content edits inside an `editableField` wrapper (any depth).
 *   2. Content edits inside a `section` whose `mutableContent` flag
 *      is `true`.
 *   3. Structural changes (add/remove/reorder blocks) inside the
 *      same containers, subject to (4).
 *
 * Always denied in document mode:
 *   4. Removing a `section` or `editableField` frame — those are
 *      template structure and only exist if the template author
 *      placed them.
 *   5. Any mutation outside an editable region — typing into a
 *      template paragraph, deleting a heading, etc.
 *
 * Transactions tagged with `tr.setMeta(TEMPLATE_GUARD_BYPASS_META, true)`
 * skip the filter — used by versioning restore and other privileged
 * library operations that already gate on a different policy method.
 *
 * In template mode the guard registers no plugin at all so authors
 * have full freedom.
 */
export const TemplateStructureGuard =
  Extension.create<TemplateStructureGuardOptions>({
    name: "templateStructureGuard",

    addOptions() {
      return {};
    },

    addProseMirrorPlugins() {
      const options = this.options;
      // Register the guard when:
      //   (a) document mode — structural rules are always enforced, or
      //   (b) readOnly — block all programmatic writes regardless of mode
      if (options.editorMode !== "document" && !options.readOnly) return [];

      return [
        new Plugin({
          key: guardPluginKey,
          filterTransaction: (tr: Transaction, state: EditorState) => {
            if (!tr.docChanged) return true;

            if (tr.getMeta(TEMPLATE_GUARD_BYPASS_META) === true) {
              // Privileged bypass — write an audit entry so every
              // structural override is traceable.
              const ctx = options.getPolicyContext?.();
              if (ctx) {
                options.audit?.record({
                  type: "structure.bypass",
                  at: Date.now(),
                  actor: { id: ctx.user.id, name: ctx.user.name },
                  documentId: ctx.documentId,
                  summary: "Template guard bypassed by privileged operation",
                  payload: {},
                });
              }
              return true;
            }

            // In readOnly mode (template or document) block everything
            // that isn't a bypass. No structural analysis needed.
            if (options.readOnly) {
              options.events?.emit("permission.denied", {
                action: "content.edit",
                reason: "Editor is read-only",
              });
              return false;
            }

            // Yjs-driven transactions originate from a remote peer
            // whose own guard already validated. Local guards can't
            // veto without diverging the shared state.
            if (tr.getMeta("y-sync$") || tr.getMeta("y-undo$")) return true;

            const policy = options.policy;
            const ctx = options.getPolicyContext?.();
            if (!policy || !ctx) return true;

            const deny = (action: string, reason: string | undefined) => {
              options.events?.emit("permission.denied", { action, reason });
              options.audit?.record({
                type: "permission.denied",
                at: Date.now(),
                actor: { id: ctx.user.id, name: ctx.user.name },
                documentId: ctx.documentId,
                summary: `${action} denied: ${reason ?? "no reason"}`,
                payload: { action, reason },
              });
            };

            for (let i = 0; i < tr.steps.length; i++) {
              const step = tr.steps[i];
              const doc = tr.docs[i] ?? state.doc;
              let blocked = false;
              let blockedAction = "structure.modify";
              let blockedReason: string | undefined;

              step.getMap().forEach((oldStart, oldEnd) => {
                if (blocked) return;

                // 1. Frame removal — section / editableField wholly
                //    enclosed in the replaced range.
                const frame = findEnclosedFrame(doc, oldStart, oldEnd);
                if (frame) {
                  const frameLabel =
                    frame.type === "section"
                      ? "Section"
                      : "Editable region";
                  blocked = true;
                  blockedAction = "structure.remove-frame";
                  blockedReason = `${frameLabel} cannot be removed in a document`;
                  return;
                }

                // 2. Editability of the affected positions. The step
                //    must be wholly inside an editable region or a
                //    mutable section.
                const startVerdict = evaluateEditability(doc, oldStart);
                if (!startVerdict.allowed) {
                  blocked = true;
                  blockedAction =
                    oldStart === oldEnd
                      ? "content.edit"
                      : "structure.modify";
                  blockedReason = startVerdict.reason;
                  return;
                }
                if (oldEnd !== oldStart) {
                  const endVerdict = evaluateEditability(doc, oldEnd);
                  if (!endVerdict.allowed) {
                    blocked = true;
                    blockedAction = "structure.modify";
                    blockedReason = endVerdict.reason;
                    return;
                  }
                }

                // 3. Route through the host policy so it can override.
                //
                // Walk up to the *editable container* (the editableField
                // or mutableContent section that `evaluateEditability`
                // found) rather than the innermost block node (paragraph,
                // heading, etc.). Using the paragraph as the container
                // causes `canModifyStructure` to hit its `default` branch
                // and deny perfectly valid content edits inside an
                // editable region.
                const $pos = doc.resolve(
                  Math.max(0, Math.min(oldStart, doc.content.size)),
                );
                let editableAncestor: import("@tiptap/pm/model").Node | null =
                  null;
                for (let d = $pos.depth; d > 0; d--) {
                  const n = $pos.node(d);
                  if (
                    n.type.name === "editableField" ||
                    (n.type.name === "section" &&
                      n.attrs.mutableContent === true)
                  ) {
                    editableAncestor = n;
                    break;
                  }
                }
                const container = editableAncestor
                  ? blockDescriptorOf(editableAncestor)
                  : $pos.depth > 0
                    ? blockDescriptorOf($pos.node($pos.depth))
                    : { type: "doc", id: null, attrs: {} };

                // All operations inside an editableField — whether
                // insertions (oldStart === oldEnd), deletions, or
                // replacements (oldStart < oldEnd) — are content fills,
                // not structural mutations. Route them to canFillField so
                // the policy gate is correct and the default policy does
                // not block them.
                if (startVerdict.via === "editableField") {
                  const decision = policy.canFillField({
                    ...ctx,
                    field: container,
                  });
                  if (!decision.allowed) {
                    blocked = true;
                    blockedAction = "field.fill";
                    blockedReason = decision.reason;
                  }
                  return;
                }
                const decision = policy.canModifyStructure({
                  ...ctx,
                  container,
                });
                if (!decision.allowed) {
                  blocked = true;
                  blockedAction = "structure.modify";
                  blockedReason = decision.reason;
                }
              });

              if (blocked) {
                deny(blockedAction, blockedReason);
                return false;
              }
            }

            return true;
          },
        }),
      ];
    },
  });
