import type { EditorExtensionModule } from "../../core/types";

/**
 * The diff view itself is a separate React surface (`DiffView`); it
 * doesn't need to add anything to the live editor's TipTap pipeline.
 * Registering an empty module here keeps the module list complete and
 * reserves the `id` so other features can opt to participate later
 * (e.g. a future bubble menu entry that opens the diff).
 */
export const diffViewModule: EditorExtensionModule = {
  id: "diff-view",
  name: "Side-by-side version diff",
  description:
    "Two read-only editors mounted with the same extension set, fed two snapshots, with block-level diff highlights.",
  tiptap: () => [],
};

export * from "./diff";
export * from "./diffDecorations";
export { DiffView, type DiffPaneVersion, type DiffViewProps } from "./DiffView";
