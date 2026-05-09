import type { EditorExtensionModule } from "../../core/types";
import { BlockAudit } from "./BlockAudit";

export const blockAuditModule: EditorExtensionModule = {
  id: "block-audit",
  name: "Block audit metadata",
  description:
    "Stamps createdBy/createdAt and modifiedBy/modifiedAt on every audited block (sections, editable fields, paragraphs, headings, lists, …) so the host can show provenance and meet audit-trail requirements.",
  tiptap: (ctx) => [
    BlockAudit.configure({
      user: { id: ctx.user.id, name: ctx.user.name },
    }),
  ],
};

export * from "./BlockAudit";
