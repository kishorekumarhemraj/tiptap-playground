import { Node, mergeAttributes } from "@tiptap/core";
import type { CommandProps } from "@tiptap/core";

/**
 * Block-level atom node that forces a hard page break at the current
 * position. Renders as a labelled divider in the editor; in print/page
 * view the pagination plugin treats this node as a mandatory break.
 */
export const PageBreak = Node.create<{ label: string }>({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return { label: "Page break" };
  },

  parseHTML() {
    return [{ tag: "div[data-type='page-break']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "page-break",
        class: "tpe-page-break-node",
        contenteditable: "false",
      }),
      this.options.label,
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }: CommandProps) =>
          chain().insertContent({ type: this.name }).run(),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.setPageBreak(),
    };
  },
});
