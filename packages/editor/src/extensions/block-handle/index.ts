import type { EditorExtensionModule } from "../../core/types";
import { BlockHandle } from "./BlockHandle";

export const blockHandleModule: EditorExtensionModule = {
  id: "block-handle",
  name: "Block drag handle",
  description:
    "Notion-style floating drag grip on hover. In document mode the handle is suppressed on locked / read-only blocks; in template mode every block is draggable. Actual moves go through the LockGuard + PermissionPolicy.canMoveBlock.",
  tiptap: (ctx) => [BlockHandle.configure({ editorMode: ctx.mode })],
};

export * from "./BlockHandle";
