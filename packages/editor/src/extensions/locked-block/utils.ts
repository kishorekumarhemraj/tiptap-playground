import type { EditorState } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { LockedBlockDescriptor } from "../../core/policy";

export function findLockedAncestor(
  state: EditorState,
  pos: number,
): { node: PMNode; pos: number } | null {
  const safe = Math.max(0, Math.min(pos, state.doc.content.size));
  const $pos = state.doc.resolve(safe);
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === "lockedBlock") {
      return { node, pos: $pos.before(depth) };
    }
  }
  return null;
}

export function resolvedAncestorLock(
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

export function descriptorOf(node: PMNode): LockedBlockDescriptor {
  return {
    mode: node.attrs.mode,
    reason: node.attrs.reason,
    condition: node.attrs.condition,
    lockedBy: node.attrs.lockedBy,
  };
}
