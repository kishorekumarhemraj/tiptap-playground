"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useMemo } from "react";
import { buildTiptapExtensions, buildToolbarItems } from "./registry";
import type { EditorExtensionContext, EditorExtensionModule } from "./types";
import { Toolbar } from "./Toolbar";
import styles from "./Editor.module.css";

export interface EditorProps {
  modules: EditorExtensionModule[];
  context: EditorExtensionContext;
  initialContent?: string;
  onUpdateJSON?: (json: unknown) => void;
}

export function Editor({
  modules,
  context,
  initialContent,
  onUpdateJSON,
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
      content: initialContent ?? defaultContent,
      editable: !context.readOnly,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: styles.proseMirror,
          spellcheck: "true",
        },
      },
      onUpdate: onUpdateJSON
        ? ({ editor: e }) => onUpdateJSON(e.getJSON())
        : undefined,
    },
    [extensions, context.readOnly],
  );

  return (
    <div className={styles.root}>
      <Toolbar editor={editor} items={toolbarItems} />
      <EditorContent editor={editor} className={styles.editorContent} />
    </div>
  );
}

const defaultContent = `
<h1>Welcome to the TipTap Playground</h1>
<p>
  This is a <strong>Notion-style</strong> editor built on TipTap. The editor
  is composed of <em>modular extensions</em>, each living under
  <code>src/editor/extensions/&lt;feature&gt;</code>.
</p>
<p>Try formatting text, creating lists, or inserting a locked section.</p>
<div data-type="locked-block" data-lock-mode="locked" data-lock-reason="Legal boilerplate">
  <p>This section is locked. Typing inside it is rejected by the transaction guard.</p>
</div>
<div data-type="locked-block" data-lock-mode="readonly">
  <p>This section is read-only - visible to everyone, editable by nobody.</p>
</div>
<div data-type="locked-block" data-lock-mode="conditional" data-lock-condition="user.role === 'admin'">
  <p>This section only opens up when the condition evaluates truthy.</p>
</div>
`;
