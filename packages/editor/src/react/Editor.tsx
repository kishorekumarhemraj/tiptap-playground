"use client";

import {
  EditorContent,
  useEditor,
  type JSONContent,
} from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
import {
  buildTiptapExtensions,
  buildToolbarItems,
} from "../core/registry";
import type {
  EditorExtensionContext,
  EditorExtensionModule,
} from "../core/types";
import { Toolbar } from "./Toolbar";
import { EditorStatusBar } from "./EditorStatusBar";
import { FloatingToolbar } from "./FloatingToolbar";
import { FloatingCommentComposer } from "./FloatingCommentComposer";
import { TemplateDragHandle } from "./DragHandle";
import {
  toEditorHandle,
  toVersionsPanelHandle,
  type EditorHandle,
  type VersionsPanelHandle,
} from "./EditorHandle";
import styles from "./Editor.module.css";

export type { EditorHandle, VersionsPanelHandle } from "./EditorHandle";

export interface EditorProps {
  modules: EditorExtensionModule[];
  context: EditorExtensionContext;
  /** Initial content: HTML string, JSON, or undefined. */
  initialContent?: string | JSONContent;
  onUpdateJSON?: (json: JSONContent) => void;
  /**
   * Delivers a read-only handle to the host. Use this to read
   * document state (content, active marks, isEmpty). For versioning
   * and other mutations, pass the `VersionsPanelHandle` (also
   * delivered here) to `VersionsPanel`.
   *
   * Avoid reaching into the raw TipTap editor via other means —
   * direct command calls bypass the policy engine.
   */
  onEditor?: (
    handle: EditorHandle | null,
    versionsPanelHandle: VersionsPanelHandle | null,
  ) => void;
  /** Hide the built-in toolbar and let the host render its own. */
  hideToolbar?: boolean;
  /** Extra className applied to the editor root. */
  className?: string;
}

export function Editor({
  modules,
  context,
  initialContent,
  onUpdateJSON,
  onEditor,
  hideToolbar,
  className,
}: EditorProps) {
  const extensions = useMemo(
    () => buildTiptapExtensions(modules, context),
    [modules, context],
  );

  const toolbarItems = useMemo(
    () => buildToolbarItems(modules, context),
    [modules, context],
  );

  const editor = useEditor(
    {
      extensions,
      content: initialContent,
      editable: !context.readOnly,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: styles.proseMirror,
          spellcheck: "true",
        },
      },
      onCreate: () => {
        context.events.emit("editor.ready", { documentId: context.documentId });
      },
      onUpdate: onUpdateJSON
        ? ({ editor: e }) => onUpdateJSON(e.getJSON() as JSONContent)
        : undefined,
      onDestroy: () => {
        context.events.emit("editor.destroy", {
          documentId: context.documentId,
        });
      },
    },
    [extensions, context.readOnly],
  );

  useEffect(() => {
    if (!onEditor) return;
    if (editor) {
      onEditor(toEditorHandle(editor), toVersionsPanelHandle(editor));
    } else {
      onEditor(null, null);
    }
    return () => {
      onEditor(null, null);
    };
  }, [editor, onEditor]);

  // Force re-render on transactions to ensure UI updates for storage mutations
  // (like track changes and instructions toggles) that don't change doc/selection.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const update = () => setTick((t) => t + 1);
    editor.on("transaction", update);
    window.addEventListener("tpe-force-update", update);
    return () => {
      editor.off("transaction", update);
      window.removeEventListener("tpe-force-update", update);
    };
  }, [editor]);

  // Drag handle is template-mode only — in document mode the structure is
  // frozen, so a handle would be misleading. We keep TemplateDragHandle
  // mounted even when inactive (active=false) to avoid the removeChild
  // crash caused by the library moving its element outside the React tree.
  const showDragHandle = context.mode === "template" && !context.readOnly;

  const hasPagesExtension = !!editor?.extensionManager.extensions.find(
    (e) => e.name === "pages",
  );
  const hasCommentsExtension = !!editor?.extensionManager.extensions.find(
    (e) => e.name === "comments",
  );

  const showInstructions =
    editor?.storage.blockInstruction?.showInstructions !== false;

  return (
    <div
      className={`${styles.root} ${className ?? ""} ${
        !showInstructions ? "tpe-instructions-hidden" : ""
      }`.trim()}
    >
      {!hideToolbar && <Toolbar editor={editor} items={toolbarItems} />}
      <EditorContent editor={editor} className={styles.editorContent} />
      {editor && (
        <FloatingToolbar editor={editor} hasComments={hasCommentsExtension} />
      )}
      {editor && hasCommentsExtension && (
        <FloatingCommentComposer editor={editor} />
      )}
      <TemplateDragHandle editor={editor} active={showDragHandle} />
      {hasPagesExtension && <EditorStatusBar editor={editor} />}
    </div>
  );
}
