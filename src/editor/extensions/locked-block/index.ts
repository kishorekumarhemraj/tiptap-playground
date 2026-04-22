import type { EditorExtensionModule } from "../../types";
import { LockedBlock } from "./LockedBlock";
import { LockGuard } from "./lockGuard";

export const lockedBlockModule: EditorExtensionModule = {
  id: "locked-block",
  name: "Locked / readonly / conditional blocks",
  description:
    "Custom container node plus a transaction-filter guard that enforces the lock at the ProseMirror level.",
  tiptap: () => [LockedBlock, LockGuard],
  toolbar: () => [
    {
      kind: "button",
      id: "wrapLocked",
      label: "🔒 Lock",
      title: "Wrap the current selection in a locked block",
      isActive: (editor) => editor.isActive("lockedBlock"),
      onRun: (editor) => {
        if (editor.isActive("lockedBlock")) {
          editor.chain().focus().unsetLockedBlock().run();
        } else {
          editor
            .chain()
            .focus()
            .setLockedBlock({
              mode: "locked",
              reason: "Policy-controlled section",
            })
            .run();
        }
      },
    },
  ],
};

export * from "./LockedBlock";
export * from "./lockGuard";
