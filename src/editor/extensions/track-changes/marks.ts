import { Mark } from "@tiptap/core";

export interface ChangeAttrs {
  author: string | null;
  authorId: string | null;
  timestamp: number | null;
}

const renderAttrs = (attrs: ChangeAttrs): Record<string, string> => {
  const out: Record<string, string> = {};
  if (attrs.author) out["data-author"] = attrs.author;
  if (attrs.authorId) out["data-author-id"] = attrs.authorId;
  if (attrs.timestamp) out["data-timestamp"] = String(attrs.timestamp);
  return out;
};

export const Insertion = Mark.create({
  name: "insertion",
  inclusive: false,
  excludes: "deletion",
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
  renderHTML({ HTMLAttributes, mark }) {
    return [
      "ins",
      {
        "data-track-change": "insert",
        ...renderAttrs(mark.attrs as ChangeAttrs),
        ...HTMLAttributes,
      },
      0,
    ];
  },
});

export const Deletion = Mark.create({
  name: "deletion",
  inclusive: false,
  excludes: "insertion",
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
  renderHTML({ HTMLAttributes, mark }) {
    return [
      "del",
      {
        "data-track-change": "delete",
        ...renderAttrs(mark.attrs as ChangeAttrs),
        ...HTMLAttributes,
      },
      0,
    ];
  },
});
