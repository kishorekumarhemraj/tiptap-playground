import type { EditorExtensionModule } from "../../core/types";
import { BlockInstruction } from "./BlockInstruction";

export const blockInstructionModule: EditorExtensionModule = {
  id: "block-instruction",
  name: "Block instructions",
  description:
    "Stores an optional one-line instruction on any top-level block and renders it as a helper above the block. Authoring-only - documents never set new instructions, they only display what the template carries.",
  tiptap: () => [BlockInstruction],
  toolbar: (ctx) => {
    if (ctx.mode !== "template") return [];
    return [
      {
        kind: "button",
        id: "toggleInstructions",
        label: "💡 Show Instructions",
        title: "Toggle block instructions visibility",
        isActive: (editor) =>
          editor.storage.blockInstruction?.showInstructions === true,
        onRun: (editor) => editor.commands.toggleInstructions(),
      },
    ];
  },
};

export * from "./BlockInstruction";
