import type {
  EditorExtensionContext,
  EditorExtensionModule,
} from "../../core/types";
import { Versioning } from "./versioning";
import { IconSaveVersion } from "../../react/icons";

function policyContextFromCtx(ctx: EditorExtensionContext) {
  return () => ({
    user: ctx.user,
    documentId: ctx.documentId,
    claims: ctx.claims,
    mode: ctx.mode,
  });
}

export const versioningModule: EditorExtensionModule = {
  id: "versioning",
  name: "Versioning",
  description:
    "Captures named snapshots via the host-supplied VersionStore. Save/restore/delete are gated on PermissionPolicy and emit audit events.",
  tiptap: (ctx) => [
    Versioning.configure({
      store: ctx.drivers.versionStore,
      author: { id: ctx.user.id, name: ctx.user.name },
      policy: ctx.policy,
      getPolicyContext: policyContextFromCtx(ctx),
      events: ctx.events,
      audit: ctx.drivers.auditLog,
      signatures: ctx.drivers.signatures,
    }),
  ],
  toolbar: () => [
    {
      kind: "button",
      id: "saveVersion",
      label: "Save version",
      title: "Save a named version snapshot",
      icon: IconSaveVersion(),
      onRun: (editor) => {
        const label =
          typeof window !== "undefined"
            ? (window.prompt("Version label", "") ?? "")
            : "";
        editor.chain().focus().saveVersion(label || undefined).run();
      },
    },
  ],
};

export * from "./versioning";
