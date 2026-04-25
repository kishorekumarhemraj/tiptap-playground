import type { EditorExtensionModule } from "../../core/types";
import { Section } from "./Section";

export const sectionModule: EditorExtensionModule = {
  id: "section",
  name: "Section container",
  description:
    "Block-level container for grouping content into named regions. Sections carry a title, an instruction, and a `mutableContent` flag that decides whether end users may add blocks inside the section in document mode.",
  tiptap: () => [Section],
  toolbar: (ctx) => {
    if (ctx.mode !== "template") return [];
    return [
      {
        kind: "button",
        id: "wrapSection",
        label: "§ Section",
        title: "Wrap the current selection in a section",
        isActive: (editor) => editor.isActive("section"),
        onRun: (editor) => {
          if (editor.isActive("section")) {
            editor.chain().focus().unsetSection().run();
          } else {
            editor.chain().focus().setSection().run();
          }
        },
      },
    ];
  },
};

export * from "./Section";
