import type { EditorExtensionModule } from "../../core/types";
import { TemplateStructureGuard } from "./TemplateStructureGuard";

export const templateGuardModule: EditorExtensionModule = {
  id: "template-guard",
  name: "Template structure guard",
  description:
    "Transaction filter enforcing the document-mode contract: structure is frozen except inside editable-field wrappers and inside sections marked `mutableContent`. Section and editable-region frames cannot be removed once the document is instantiated.",
  tiptap: (ctx) => [
    TemplateStructureGuard.configure({
      policy: ctx.policy,
      getPolicyContext: () => ({
        user: ctx.user,
        documentId: ctx.documentId,
        claims: ctx.claims,
        mode: ctx.mode,
      }),
      events: ctx.events,
      audit: ctx.drivers.auditLog,
      editorMode: ctx.mode,
    }),
  ],
};

export * from "./TemplateStructureGuard";
export * from "./utils";
