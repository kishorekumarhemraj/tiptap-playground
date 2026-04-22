import { Mark } from "@tiptap/core";
import type { EditorExtensionModule } from "../../types";

/**
 * Track changes stub.
 *
 * Track-changes in ProseMirror is typically implemented as a pair of
 * marks (`insertion` and `deletion`) that carry author + timestamp
 * attributes. When "track changes" is ON, an input rule rewrites every
 * replace step so insertions become `insertion` marks and deletions
 * keep the original text wrapped in a `deletion` mark. Accept/reject
 * then just removes the mark (or the marked text).
 *
 * We ship the two marks here so the schema is stable from day one -
 * upgrading to a real implementation won't require a document migration.
 */
const Insertion = Mark.create({
  name: "insertion",
  addAttributes() {
    return {
      author: { default: null },
      authorId: { default: null },
      timestamp: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "ins[data-track-change]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["ins", { "data-track-change": "insert", ...HTMLAttributes }, 0];
  },
});

const Deletion = Mark.create({
  name: "deletion",
  addAttributes() {
    return {
      author: { default: null },
      authorId: { default: null },
      timestamp: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "del[data-track-change]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["del", { "data-track-change": "delete", ...HTMLAttributes }, 0];
  },
});

export interface TrackChangesFeatureConfig {
  active: boolean;
}

export const trackChangesModule: EditorExtensionModule = {
  id: "track-changes",
  name: "Track changes",
  description:
    "Insertion / deletion marks so edits can be proposed, reviewed, and accepted or rejected - the MS Word workflow.",
  tiptap: () => [Insertion, Deletion],
};
