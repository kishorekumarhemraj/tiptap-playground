import type { EditorExtensionModule } from "../../core/types";
import { Field } from "./Field";

export const fieldModule: EditorExtensionModule = {
  id: "field",
  name: "Form field",
  description:
    "Inline atomic node that embeds a host-rendered form control (select, date picker, currency input, …). Field metadata and rendering live on the host via the `FieldRegistry` driver; the node carries only `id`, `fieldId`, and `value`.",
  tiptap: (ctx) => [
    Field.configure({
      editorMode: ctx.mode,
      registry: ctx.drivers.fields,
      policy: ctx.policy,
      getPolicyContext: () => ({
        user: ctx.user,
        documentId: ctx.documentId,
        claims: ctx.claims,
        mode: ctx.mode,
      }),
      events: ctx.events,
      audit: ctx.drivers.auditLog,
    }),
  ],
};

export * from "./Field";
