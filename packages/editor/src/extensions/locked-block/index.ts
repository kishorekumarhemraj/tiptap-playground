import type {
  EditorExtensionContext,
  EditorExtensionModule,
} from "../../core/types";
import { LockedBlock } from "./LockedBlock";
import { LockGuard } from "./lockGuard";

function policyContextFromCtx(ctx: EditorExtensionContext) {
  return () => ({
    user: ctx.user,
    documentId: ctx.documentId,
    claims: ctx.claims,
    mode: ctx.mode,
  });
}

export const lockedBlockModule: EditorExtensionModule = {
  id: "locked-block",
  name: "Locked / readonly / conditional blocks",
  description:
    "Container node + transaction-filter guard that routes edit/unlock/mode-change decisions through the host PermissionPolicy.",
  tiptap: (ctx) => [
    LockedBlock.configure({
      policy: ctx.policy,
      getPolicyContext: policyContextFromCtx(ctx),
      events: ctx.events,
      audit: ctx.drivers.auditLog,
      editorMode: ctx.mode,
    }),
    LockGuard.configure({
      policy: ctx.policy,
      getPolicyContext: policyContextFromCtx(ctx),
      events: ctx.events,
    }),
  ],
  toolbar: (ctx) => {
    // Locking is an authoring action: only contribute the button in
    // template mode. Document consumers see no lock affordance.
    if (ctx.mode !== "template") return [];
    return [
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
    ];
  },
};

export * from "./LockedBlock";
export * from "./lockGuard";
