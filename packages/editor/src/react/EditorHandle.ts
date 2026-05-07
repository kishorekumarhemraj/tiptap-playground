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
  /**
   * One-shot bootstrap: if the document is currently empty, replace it
   * with the supplied content. Intended for hosts using the
   * collaboration extension, where the Y.Doc supersedes the
   * `initialContent` prop on first run. No-op when content already
   * exists, so re-calling on every render is safe.
   */
  bootstrapIfEmpty: (content: string | JSONContent) => boolean;
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
    bootstrapIfEmpty: (content) => {
      if (editor.isDestroyed) return false;
      if (!editor.isEmpty && editor.state.doc.content.size > 2) return false;
      // setContent fights with the y-prosemirror sync plugin in some
      // mount sequences (returns true but the replace silently rolls
      // back). insertContentAt at the doc end replaces nothing, just
      // appends, which is a path the collab plugin reliably propagates.
      const ok = editor
        .chain()
        .insertContentAt(editor.state.doc.content.size, content)
        .run();
      return ok && !editor.isEmpty;
    },
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
