import { Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: () => ReturnType;
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreakNode = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML() {
    return [
      "div",
      {
        "data-type": "page-break",
        style:
          "display:flex;align-items:center;gap:8px;margin:4px 0;color:#999;font-size:12px;user-select:none;pointer-events:none",
        contenteditable: "false",
      },
      [
        "span",
        {
          style:
            "flex:1;border-top:1px dashed #ccc",
        },
      ],
      ["span", {}, "Page Break"],
      [
        "span",
        {
          style:
            "flex:1;border-top:1px dashed #ccc",
        },
      ],
    ];
  },

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name })
            .run(),
    };
  },
});
