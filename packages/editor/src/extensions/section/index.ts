import type { EditorExtensionModule } from "../../core/types";
import { Section } from "./Section";
import { IconSection } from "../../react/icons";

export const sectionModule: EditorExtensionModule = {
  id: "section",
  name: "Section container",
  description:
    "Block-level container for grouping content into named regions. Sections carry a title, an instruction, and a `mutableContent` flag that decides whether end users may add blocks inside the section in document mode.",
  tiptap: (ctx) => [Section.configure({ editorMode: ctx.mode })],
  toolbar: (ctx) => {
    // Template-only — hidden in document mode (REQ-TA-12, REQ-TA-13)
    if (ctx.mode !== "template") return [];
    return [
      { kind: "divider", id: "template-tools-divider" },
      {
        kind: "button",
        id: "wrapSection",
        label: "Section",
        title: "Wrap selection in a section",
        icon: IconSection(),
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
