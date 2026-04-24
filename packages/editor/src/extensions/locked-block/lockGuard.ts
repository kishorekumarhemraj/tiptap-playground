import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import type {
  PermissionPolicy,
  PolicyContext,
  LockedBlockDescriptor,
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

function descriptorOf(node: PMNode): LockedBlockDescriptor {
  return {
    mode: node.attrs.mode,
    reason: node.attrs.reason,
    condition: node.attrs.condition,
    lockedBy: node.attrs.lockedBy,
  };
}

function resolvedAncestorLock(
  doc: PMNode,
  pos: number,
): PMNode | null {
  const safe = Math.max(0, Math.min(pos, doc.content.size));
  const $pos = doc.resolve(safe);
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === "lockedBlock") return node;
  }
  return null;
}

/**
 * Transaction filter that protects locked blocks from two kinds of
 * mutation:
 *
 * 1. **Content edits** — a step that writes inside a locked block.
 *    Routed through `PermissionPolicy.canEditBlock` so hosts can
 *    layer their own rules (e.g. admins can edit readonly blocks).
 * 2. **Block moves / deletions** — a step whose replaced range
 *    encloses a whole locked block (drag-reorder, backspace at the
 *    boundary, cut). Routed through `PermissionPolicy.canMoveBlock`.
 *
 * In `template` mode the default policy allows both; in `document`
 * mode it denies both for locked / read-only blocks. This is the
 * single enforcement seam — UI can still render whatever it likes
 * and trust that the transaction filter will veto disallowed edits.
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
          let blockedAction: string | undefined;
          let blockedReason: string | undefined;

          const deny = (action: string, reason: string | undefined) => {
            blocked = true;
            blockedAction = action;
            blockedReason = reason;
          };

          for (let i = 0; i < tr.steps.length && !blocked; i++) {
            const step = tr.steps[i];
            const json = step.toJSON() as { from?: number; to?: number };
            const from = json.from;
            const to = json.to ?? from;
            if (typeof from !== "number" || typeof to !== "number") continue;

            const doc = tr.docs[i] ?? state.doc;
            const safeFrom = Math.min(from, doc.content.size);
            const safeTo = Math.min(to, doc.content.size);

            // 1) Block-move / delete: a locked block wholly inside the
            //    replaced range is being removed. Drag-reorder produces
            //    a delete step on the source followed by an insert step
            //    on the destination — vetoing the delete is enough to
            //    cancel the move.
            doc.nodesBetween(safeFrom, safeTo, (node, pos) => {
              if (blocked) return false;
              if (node.type.name !== "lockedBlock") return true;
              const start = pos;
              const end = pos + node.nodeSize;
              if (start >= safeFrom && end <= safeTo) {
                const decision = policy.canMoveBlock({
                  ...ctx,
                  block: descriptorOf(node),
                });
                if (!decision.allowed) {
                  deny("block.move", decision.reason);
                }
                return false; // don't descend — we already matched the block
              }
              return true;
            });
            if (blocked) break;

            // 2) Content edit: a step whose endpoints live inside the
            //    same locked block. `canEditBlock` decides.
            const fromLock = resolvedAncestorLock(doc, safeFrom);
            const toLock = resolvedAncestorLock(doc, safeTo);
            for (const lock of [fromLock, toLock]) {
              if (!lock) continue;
              const decision = policy.canEditBlock({
                ...ctx,
                block: descriptorOf(lock),
              });
              if (!decision.allowed) {
                deny("block.edit", decision.reason);
                break;
              }
            }
          }

          if (blocked) {
            options.events?.emit("permission.denied", {
              action: blockedAction ?? "block.edit",
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
