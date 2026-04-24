import type { EditorExtensionModule } from "../../core/types";
import { BlockInstruction } from "./BlockInstruction";

export const blockInstructionModule: EditorExtensionModule = {
  id: "block-instruction",
  name: "Block instructions",
  description:
    "Stores an optional one-line instruction on any top-level block and renders it as a helper above the block. Authoring-only - documents never set new instructions, they only display what the template carries.",
  tiptap: () => [BlockInstruction],
};

export * from "./BlockInstruction";
