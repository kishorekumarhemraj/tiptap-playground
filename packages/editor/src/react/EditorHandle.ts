import type { Editor as TiptapEditor, JSONContent } from "@tiptap/react";
import type { VersionSnapshot } from "../drivers/version-store";

/**
 * Read-only handle returned to host applications via the `onEditor`
 * callback. Hosts should use this for reading document state (content,
 * active marks, emptiness) without reaching into TipTap internals or
 * bypassing the policy engine.
 *
 * To trigger policy-gated mutations (save/restore version, accept
 * changes, etc.) use the toolbar or the `VersionsPanelHandle` that
 * `VersionsPanel` manages internally.
 */
export interface EditorHandle {
  getJSON: () => JSONContent;
  getHTML: () => string;
  getText: () => string;
  readonly isEmpty: boolean;
  isActive: (
    nameOrAttrs: string | Record<string, unknown>,
    attrs?: Record<string, unknown>,
  ) => boolean;
}

/**
 * Typed handle passed to `VersionsPanel`. It exposes only the
 * versioning commands the panel needs — all of which are already
 * gated by the policy engine inside the extension.
 */
export interface VersionsPanelHandle {
  subscribe: (listener: (snapshots: VersionSnapshot[]) => void) => () => void;
  saveVersion: (label?: string) => void;
  restoreVersion: (id: string) => void;
  deleteVersion: (id: string) => void;
}

export function toEditorHandle(editor: TiptapEditor): EditorHandle {
  return {
    getJSON: () => editor.getJSON() as JSONContent,
    getHTML: () => editor.getHTML(),
    getText: () => editor.getText(),
    get isEmpty() {
      return editor.isEmpty;
    },
    isActive: (nameOrAttrs, attrs) =>
      typeof nameOrAttrs === "string"
        ? editor.isActive(nameOrAttrs, attrs)
        : editor.isActive(nameOrAttrs),
  };
}

export function toVersionsPanelHandle(
  editor: TiptapEditor,
): VersionsPanelHandle | null {
  const storage = editor.storage.versioning;
  if (!storage) return null;
  return {
    subscribe: (listener) => storage.subscribe(listener),
    saveVersion: (label) =>
      editor.chain().focus().saveVersion(label).run(),
    restoreVersion: (id) =>
      editor.chain().focus().restoreVersion(id).run(),
    deleteVersion: (id) =>
      editor.chain().focus().deleteVersion(id).run(),
  };
}
