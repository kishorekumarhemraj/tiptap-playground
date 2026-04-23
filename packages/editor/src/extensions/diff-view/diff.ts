import type { JSONContent } from "@tiptap/react";

export type BlockDiffStatus = "added" | "removed" | "unchanged";

export interface BlockDiffEntry {
  /** Index of the top-level block in its source doc. */
  index: number;
  status: BlockDiffStatus;
  /** Stable text key used to align blocks across docs. */
  key: string;
}

export interface DiffResult {
  left: BlockDiffEntry[];
  right: BlockDiffEntry[];
}

function blockText(node: JSONContent): string {
  if (typeof node.text === "string") return node.text;
  if (!Array.isArray(node.content)) return "";
  return node.content.map(blockText).join("");
}

function blockKey(node: JSONContent, index: number): string {
  // Type plus normalized text content. This is a coarse alignment key
  // - good enough for paragraph-level diffs in a playground; a real
  // version should use ProseMirror's diff or LCS over node identity.
  const text = blockText(node).trim().toLowerCase();
  return `${node.type ?? "?"}::${text || `__empty_${index}__`}`;
}

/**
 * Block-level diff between two TipTap docs. We align top-level
 * children by `(type, text)` key: blocks present on both sides are
 * `unchanged`, the rest are tagged `removed` / `added`.
 *
 * Doesn't do moves or sub-block edits - paragraphs that changed even
 * a single character show up as one removal + one addition. That's
 * the right behaviour for a "what's different?" overview pane.
 */
export function diffDocs(left: JSONContent, right: JSONContent): DiffResult {
  const leftBlocks = left.content ?? [];
  const rightBlocks = right.content ?? [];

  const leftKeys = leftBlocks.map((b, i) => blockKey(b, i));
  const rightKeys = rightBlocks.map((b, i) => blockKey(b, i));

  const rightCounts = new Map<string, number>();
  for (const k of rightKeys) {
    rightCounts.set(k, (rightCounts.get(k) ?? 0) + 1);
  }

  const leftCounts = new Map<string, number>();
  for (const k of leftKeys) {
    leftCounts.set(k, (leftCounts.get(k) ?? 0) + 1);
  }

  const leftEntries: BlockDiffEntry[] = leftKeys.map((key, index) => {
    if ((rightCounts.get(key) ?? 0) > 0) {
      rightCounts.set(key, (rightCounts.get(key) ?? 0) - 1);
      return { index, key, status: "unchanged" };
    }
    return { index, key, status: "removed" };
  });

  const rightEntries: BlockDiffEntry[] = rightKeys.map((key, index) => {
    if ((leftCounts.get(key) ?? 0) > 0) {
      leftCounts.set(key, (leftCounts.get(key) ?? 0) - 1);
      return { index, key, status: "unchanged" };
    }
    return { index, key, status: "added" };
  });

  return { left: leftEntries, right: rightEntries };
}
