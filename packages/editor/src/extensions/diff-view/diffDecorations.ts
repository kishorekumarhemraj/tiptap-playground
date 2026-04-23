import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { BlockDiffEntry } from "./diff";

export interface DiffDecorationsOptions {
  /** Per-block diff status, indexed by top-level child position. */
  entries: BlockDiffEntry[];
}

const diffDecorationsPluginKey = new PluginKey("diffDecorations");

/**
 * Decorates each top-level block of the document with a class based
 * on its `BlockDiffEntry`. Used in the diff view; lives as a TipTap
 * extension so the diff editors can reuse the same module pipeline
 * as the live editor.
 */
export const DiffDecorations = Extension.create<DiffDecorationsOptions>({
  name: "diffDecorations",

  addOptions() {
    return { entries: [] };
  },

  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        key: diffDecorationsPluginKey,
        props: {
          decorations(state) {
            const entries = ext.options.entries;
            if (!entries.length) return DecorationSet.empty;

            const decorations: Decoration[] = [];
            let i = 0;
            state.doc.forEach((node, offset) => {
              const entry = entries[i++];
              if (!entry) return;
              if (entry.status === "unchanged") return;
              const className =
                entry.status === "added" ? "diff-added" : "diff-removed";
              decorations.push(
                Decoration.node(offset, offset + node.nodeSize, {
                  class: className,
                }),
              );
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
