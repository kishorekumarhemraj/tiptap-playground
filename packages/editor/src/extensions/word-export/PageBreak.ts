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
        class: "tpe-page-break-node",
        contenteditable: "false",
      },
      ["span", {}, "Page Break"],
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
