import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * Inline highlight mark that anchors a comment thread to a text range.
 * Attributes:
 *  - threadId  — UUID linking to a ThreadData record in the ThreadStore
 *  - orphan    — true when the thread is resolved/deleted; the mark is
 *                retained so the thread can be unresolved ("revived")
 *                without losing its document position.
 */
export const CommentMark = Mark.create({
  name: "comment",
  excludes: "",
  inclusive: false,
  keepOnSplit: true,

  addAttributes() {
    return {
      threadId: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-thread-id"),
        renderHTML: (attrs) => ({ "data-thread-id": attrs.threadId as string }),
      },
      orphan: {
        default: false,
        parseHTML: (el) => el.hasAttribute("data-orphan"),
        renderHTML: (attrs) =>
          (attrs.orphan as boolean) ? { "data-orphan": "" } : {},
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "comment-mark" }),
    ];
  },

  parseHTML() {
    return [{ tag: "span.comment-mark" }];
  },
});
