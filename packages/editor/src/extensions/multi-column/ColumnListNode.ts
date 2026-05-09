import { Node } from "@tiptap/core";

/**
 * Container for two or more Column nodes.
 * Renders as a flex-row div; columns manage their own flex-grow widths.
 */
export const ColumnList = Node.create({
  name: "columnList",
  group: "block",
  content: "column column+", // minimum two columns
  defining: true,
  isolating: true,

  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (el) => {
          if (typeof el === "string") return false;
          return el.getAttribute("data-node-type") === "columnList" ? {} : false;
        },
      },
    ];
  },

  renderHTML() {
    const div = document.createElement("div");
    div.className = "editor-column-list";
    div.setAttribute("data-node-type", "columnList");
    div.style.display = "flex";
    div.style.gap = "0";
    return { dom: div, contentDOM: div };
  },
});
