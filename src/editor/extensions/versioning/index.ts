import type { EditorExtensionModule } from "../../types";
import { Versioning } from "./versioning";
import { localStorageVersionStore } from "./types";

export const versioningModule: EditorExtensionModule = {
  id: "versioning",
  name: "Versioning",
  description:
    "Captures named snapshots of the document for history, restore, and diff.",
  tiptap: (ctx) => [
    Versioning.configure({
      store: localStorageVersionStore(ctx.documentId),
      author: { id: ctx.user.id, name: ctx.user.name },
    }),
  ],
  toolbar: () => [
    {
      kind: "button",
      id: "saveVersion",
      label: "💾 Save version",
      title: "Capture a named snapshot of the current document",
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

export * from "./types";
export * from "./versioning";
