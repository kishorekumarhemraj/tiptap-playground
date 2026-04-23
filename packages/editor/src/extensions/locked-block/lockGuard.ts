import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import type {
  PermissionPolicy,
  PolicyContext,
} from "../../core/policy";
import type { EditorEventBus } from "../../core/events";

export interface LockGuardOptions {
  policy?: PermissionPolicy;
  getPolicyContext?: () => PolicyContext;
  events?: EditorEventBus;
}

const lockGuardPluginKey = new PluginKey("lockedBlockGuard");

function findLockedAncestor(
  state: EditorState,
  pos: number,
): { node: PMNode; pos: number } | null {
  const $pos = state.doc.resolve(Math.min(pos, state.doc.content.size));
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === "lockedBlock") {
      return { node, pos: $pos.before(depth) };
    }
  }
  return null;
}

/**
 * Transaction filter that rejects any edit whose replace-step touches
 * content inside a locked block that is currently not editable.
 *
 * "Editable?" is decided by the host `PermissionPolicy.canEditBlock`,
 * so regulated apps can layer their own rules (e.g. "admins can edit
 * readonly blocks") without forking the library.
 */
export const LockGuard = Extension.create<LockGuardOptions>({
  name: "lockedBlockGuard",

  addOptions() {
    return {};
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: lockGuardPluginKey,
        filterTransaction: (tr: Transaction, state: EditorState) => {
          if (!tr.docChanged) return true;
          const policy = options.policy;
          const ctx = options.getPolicyContext?.();
          if (!policy || !ctx) return true;

          let blocked = false;
          let blockedReason: string | undefined;

          tr.steps.forEach((step, idx) => {
            if (blocked) return;
            const json = step.toJSON() as { from?: number; to?: number };
            const from = json.from;
            const to = json.to ?? from;
            if (typeof from !== "number") return;

            const doc = tr.docs[idx] ?? state.doc;
            const start = doc.resolve(Math.min(from, doc.content.size));
            const end = doc.resolve(Math.min(to ?? from, doc.content.size));

            for (const $pos of [start, end]) {
              for (let depth = $pos.depth; depth > 0; depth--) {
                const node = $pos.node(depth);
                if (node.type.name !== "lockedBlock") continue;
                const decision = policy.canEditBlock({
                  ...ctx,
                  block: {
                    mode: node.attrs.mode,
                    reason: node.attrs.reason,
                    condition: node.attrs.condition,
                    lockedBy: node.attrs.lockedBy,
                  },
                });
                if (!decision.allowed) {
                  blocked = true;
                  blockedReason = decision.reason;
                  return;
                }
              }
            }
          });

          if (blocked) {
            options.events?.emit("permission.denied", {
              action: "block.edit",
              reason: blockedReason,
            });
          }
          return !blocked;
        },
      }),
    ];
  },
});

export { findLockedAncestor };
