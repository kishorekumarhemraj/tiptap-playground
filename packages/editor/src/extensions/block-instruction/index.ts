import type { EditorExtensionModule } from "../../core/types";
import { BlockInstruction } from "./BlockInstruction";
import { IconInstruction } from "../../react/icons";

export const blockInstructionModule: EditorExtensionModule = {
  id: "block-instruction",
  name: "Block instructions",
  description:
    "Stores an optional one-line instruction on any top-level block and renders it as a helper above the block. Authoring-only — documents never set new instructions, they only display what the template carries.",
  tiptap: () => [BlockInstruction],
  toolbar: (ctx) => {
    // Template-only — hidden in document mode (REQ-TA-12, REQ-TA-13)
    if (ctx.mode !== "template") return [];
    return [
      {
        kind: "button",
        id: "toggleInstructions",
        label: "Show instructions",
        title: "Toggle instruction hints",
        icon: IconInstruction(),
        isActive: (editor) =>
          editor.storage.blockInstruction?.showInstructions === true,
        onRun: (editor) => editor.commands.toggleInstructions(),
      },
    ];
  },
};

export * from "./BlockInstruction";
