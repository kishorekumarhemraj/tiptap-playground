import { Node } from "@tiptap/core";

/**
 * A single column inside a ColumnList.
 * Width is stored as a flex-grow ratio (default 1 = equal width).
 * When a new column is inserted the other columns keep their widths and the
 * new one starts at 1, letting CSS flex-grow distribute space proportionally.
 */
export const Column = Node.create({
  name: "column",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      /** flex-grow ratio — proportional to sibling columns */
      width: {
        default: 1,
        parseHTML: (el) => {
          const v = el.getAttribute("data-width");
          if (v === null) return null;
          const n = parseFloat(v);
          return isFinite(n) ? n : null;
        },
        renderHTML: (attrs) => ({
          "data-width": String(attrs.width as number),
          style: `flex-grow: ${attrs.width as number};`,
        }),
      },
      /** Stable ID used by the resize plugin to locate nodes */
      colId: {
        default: () =>
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2),
        parseHTML: (el) => el.getAttribute("data-col-id"),
        renderHTML: (attrs) => ({ "data-col-id": attrs.colId as string }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (el) => {
          if (typeof el === "string") return false;
          return el.getAttribute("data-node-type") === "column" ? {} : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const div = document.createElement("div");
    div.className = "editor-column";
    div.setAttribute("data-node-type", "column");
    for (const [k, v] of Object.entries(HTMLAttributes)) {
      div.setAttribute(k, String(v));
    }
    return { dom: div, contentDOM: div };
  },
});
