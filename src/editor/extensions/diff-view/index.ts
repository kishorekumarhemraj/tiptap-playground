import type { EditorExtensionModule } from "../../types";

/**
 * Side-by-side diff stub.
 *
 * The diff UI itself is a separate React surface (two read-only editors
 * mounted with the same extension set, fed two different snapshots).
 * This module exists so the diff view can *participate* in the same
 * extension pipeline - e.g. track-changes marks need to render the
 * same way in both panes, and locked blocks need to show their
 * chrome. Registering an empty module here reserves the `id` and the
 * entry in the toolbar for triggering a comparison.
 */
export const diffViewModule: EditorExtensionModule = {
  id: "diff-view",
  name: "Side-by-side version diff",
  description:
    "Two editors mounted with the same extension set, fed two snapshots, scroll-synced. See docs for the host-side renderer.",
  tiptap: () => [],
};
