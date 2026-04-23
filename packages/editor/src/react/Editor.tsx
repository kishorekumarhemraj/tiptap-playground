"use client";

import {
  EditorContent,
  useEditor,
  type Editor as TiptapEditor,
  type JSONContent,
} from "@tiptap/react";
import { useEffect, useMemo } from "react";
import {
  buildTiptapExtensions,
  buildToolbarItems,
} from "../core/registry";
import type {
  EditorExtensionContext,
  EditorExtensionModule,
} from "../core/types";
import { Toolbar } from "./Toolbar";
import styles from "./Editor.module.css";

export interface EditorProps {
  modules: EditorExtensionModule[];
  context: EditorExtensionContext;
  /** Initial content: HTML string, JSON, or undefined. */
  initialContent?: string | JSONContent;
  onUpdateJSON?: (json: JSONContent) => void;
  /** Called whenever the underlying TipTap editor instance changes. */
  onEditor?: (editor: TiptapEditor | null) => void;
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
    onEditor?.(editor);
    return () => {
      onEditor?.(null);
    };
  }, [editor, onEditor]);

  return (
    <div className={`${styles.root} ${className ?? ""}`.trim()}>
      {!hideToolbar && <Toolbar editor={editor} items={toolbarItems} />}
      <EditorContent editor={editor} className={styles.editorContent} />
    </div>
  );
}
