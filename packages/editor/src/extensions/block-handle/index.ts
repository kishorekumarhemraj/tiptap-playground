import type { EditorExtensionModule } from "../../core/types";
import { BlockHandle } from "./BlockHandle";

export const blockHandleModule: EditorExtensionModule = {
  id: "block-handle",
  name: "Block drag handle",
  description:
    "Notion-style floating drag grip on hover. In template mode every block is draggable; in document mode the handle is suppressed (the structure guard would reject moves anyway). Slated to be replaced by @tiptap/extension-drag-handle-react.",
  tiptap: (ctx) => [BlockHandle.configure({ editorMode: ctx.mode })],
};

export * from "./BlockHandle";
