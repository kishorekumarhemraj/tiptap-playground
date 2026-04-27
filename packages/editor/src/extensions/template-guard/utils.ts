import type { Node as PMNode } from "@tiptap/pm/model";
import type { BlockDescriptor } from "../../core/policy";

export interface EditabilityVerdict {
  allowed: boolean;
  reason: string;
  /**
   * The closest ancestor whose decision drove this verdict. The
   * structure guard surfaces this in `permission.denied` payloads
   * so the host can offer a precise message.
   */
  via: "editableField" | "mutableSection" | "frozen";
}

/**
 * Walk up the resolved position. The first `editableField` or
 * `mutableContent === true` section we encounter wins; otherwise the
 * position is in frozen template content.
 */
export function evaluateEditability(
  doc: PMNode,
  pos: number,
): EditabilityVerdict {
  const safe = Math.max(0, Math.min(pos, doc.content.size));
  const $pos = doc.resolve(safe);
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === "editableField") {
      return {
        allowed: true,
        reason: "editable region",
        via: "editableField",
      };
    }
    if (
      node.type.name === "section" &&
      node.attrs.mutableContent === true
    ) {
      return {
        allowed: true,
        reason: "mutable section",
        via: "mutableSection",
      };
    }
  }
  return {
    allowed: false,
    reason: "Outside any editable region",
    via: "frozen",
  };
}

/**
 * Find the first frame node (`section` or `editableField`) that is
 * wholly enclosed in `[from, to]`. Returns the node + its outer
 * position so callers can report where the violation occurred.
 */
export function findEnclosedFrame(
  doc: PMNode,
  from: number,
  to: number,
): { type: string; pos: number; node: PMNode } | null {
  const safeFrom = Math.max(0, Math.min(from, doc.content.size));
  const safeTo = Math.max(0, Math.min(to, doc.content.size));
  if (safeFrom >= safeTo) return null;

  let found: { type: string; pos: number; node: PMNode } | null = null;
  doc.nodesBetween(safeFrom, safeTo, (node, pos) => {
    if (found) return false;
    if (node.type.name !== "section" && node.type.name !== "editableField") {
      return true;
    }
    const start = pos;
    const end = pos + node.nodeSize;
    if (start >= safeFrom && end <= safeTo) {
      found = { type: node.type.name, pos, node };
      return false;
    }
    // Descend into the frame to look for nested frames.
    return true;
  });
  return found;
}

/** Build a `BlockDescriptor` from a ProseMirror node. */
export function blockDescriptorOf(node: PMNode): BlockDescriptor {
  const idAttr = node.attrs?.id;
  return {
    type: node.type.name,
    id: typeof idAttr === "string" ? idAttr : null,
    attrs: { ...node.attrs },
  };
}
