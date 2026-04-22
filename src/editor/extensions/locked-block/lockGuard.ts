import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { LockMode } from "./LockedBlock";

/**
 * Evaluator for a `conditional` lock's expression. We keep the
 * contract minimal so it can grow later (role gating, feature flags,
 * schedule-based locks...) without breaking the schema.
 */
export type ConditionEvaluator = (condition: string) => boolean;

interface LockGuardOptions {
  /**
   * Returns true when the block is currently editable. When the block
   * is `conditional`, the condition string is routed through this
   * function. The default policy treats every conditional block as
   * *not* editable until the host app wires up a real evaluator.
   */
  canEdit?: (args: {
    mode: LockMode;
    condition: string | null;
    lockedBy: string | null;
  }) => boolean;
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

export const LockGuard = Extension.create<LockGuardOptions>({
  name: "lockedBlockGuard",

  addOptions() {
    return {
      canEdit: ({ mode }) => mode !== "locked" && mode !== "readonly",
    };
  },

  addProseMirrorPlugins() {
    const canEdit = this.options.canEdit!;
    return [
      new Plugin({
        key: lockGuardPluginKey,
        filterTransaction: (tr: Transaction, state: EditorState) => {
          if (!tr.docChanged) return true;

          // Walk every replace step and reject if any touches a locked
          // block that's currently not editable. We resolve the
          // ancestor in the *pre-transaction* doc because the step's
          // positions are expressed in that coordinate space.
          let blocked = false;
          tr.steps.forEach((step, idx) => {
            if (blocked) return;
            const stepJSON = step.toJSON() as { from?: number; to?: number };
            const from = stepJSON.from;
            const to = stepJSON.to ?? from;
            if (typeof from !== "number") return;

            const doc = tr.docs[idx] ?? state.doc;
            const start = doc.resolve(Math.min(from, doc.content.size));
            const end = doc.resolve(Math.min(to ?? from, doc.content.size));

            for (const $pos of [start, end]) {
              for (let depth = $pos.depth; depth > 0; depth--) {
                const node = $pos.node(depth);
                if (node.type.name !== "lockedBlock") continue;
                const editable = canEdit({
                  mode: node.attrs.mode,
                  condition: node.attrs.condition,
                  lockedBy: node.attrs.lockedBy,
                });
                if (!editable) {
                  blocked = true;
                  return;
                }
              }
            }
          });
          return !blocked;
        },
      }),
    ];
  },
});

export { findLockedAncestor };
