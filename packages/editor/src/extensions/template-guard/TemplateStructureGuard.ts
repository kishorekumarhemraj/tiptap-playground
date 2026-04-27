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
   * Editor-level mode. The guard only enforces when this is
   * `"document"` — template authoring is unrestricted.
   */
  editorMode?: EditorMode;
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
      if (options.editorMode !== "document") return [];

      return [
        new Plugin({
          key: guardPluginKey,
          filterTransaction: (tr: Transaction, state: EditorState) => {
            if (!tr.docChanged) return true;
            if (tr.getMeta(TEMPLATE_GUARD_BYPASS_META) === true) return true;
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
                const $pos = doc.resolve(
                  Math.max(0, Math.min(oldStart, doc.content.size)),
                );
                const container =
                  $pos.depth > 0
                    ? blockDescriptorOf($pos.node($pos.depth))
                    : { type: "doc", id: null, attrs: {} };

                if (oldStart === oldEnd && startVerdict.via === "editableField") {
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
