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
 * A standard Longest Common Subsequence (LCS) implementation to align
 * arrays of string keys, preserving order and identifying added/removed items.
 */
function computeLCS(left: string[], right: string[]): { leftIdx: number; rightIdx: number }[] {
  const m = left.length;
  const n = right.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (left[i - 1] === right[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs: { leftIdx: number; rightIdx: number }[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (left[i - 1] === right[j - 1]) {
      lcs.unshift({ leftIdx: i - 1, rightIdx: j - 1 });
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return lcs;
}

/**
 * Maximum number of top-level blocks diffed. Beyond this threshold the
 * O(n*m) DP table would require > MAX²/2 cells; we truncate rather than
 * hang the browser for pathologically large documents.
 */
const MAX_DIFF_BLOCKS = 500;

/**
 * Block-level diff between two TipTap docs. We align top-level
 * children by `(type, text)` key using an LCS algorithm. Blocks present
 * in the LCS are `unchanged`, the rest are tagged `removed` / `added`.
 *
 * Doesn't do moves or sub-block edits — paragraphs that changed even
 * a single character show up as one removal + one addition. That's
 * the right behaviour for a "what's different?" overview pane.
 */
export function diffDocs(left: JSONContent, right: JSONContent): DiffResult {
  const leftBlocks = (left.content ?? []).slice(0, MAX_DIFF_BLOCKS);
  const rightBlocks = (right.content ?? []).slice(0, MAX_DIFF_BLOCKS);

  // Fast path: identical JSON structure → all blocks are unchanged.
  if (JSON.stringify(leftBlocks) === JSON.stringify(rightBlocks)) {
    const leftEntries: BlockDiffEntry[] = leftBlocks.map((b, i) => ({
      index: i,
      key: blockKey(b, i),
      status: "unchanged",
    }));
    return { left: leftEntries, right: [...leftEntries] };
  }

  const leftKeys = leftBlocks.map((b, i) => blockKey(b, i));
  const rightKeys = rightBlocks.map((b, i) => blockKey(b, i));

  const lcs = computeLCS(leftKeys, rightKeys);
  const lcsLeft = new Set(lcs.map((m) => m.leftIdx));
  const lcsRight = new Set(lcs.map((m) => m.rightIdx));

  const leftEntries: BlockDiffEntry[] = leftKeys.map((key, index) => ({
    index,
    key,
    status: lcsLeft.has(index) ? "unchanged" : "removed",
  }));

  const rightEntries: BlockDiffEntry[] = rightKeys.map((key, index) => ({
    index,
    key,
    status: lcsRight.has(index) ? "unchanged" : "added",
  }));

  return { left: leftEntries, right: rightEntries };
}
