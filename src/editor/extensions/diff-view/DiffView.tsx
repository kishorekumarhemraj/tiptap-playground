"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { useMemo } from "react";
import { buildTiptapExtensions } from "../../registry";
import type {
  EditorExtensionContext,
  EditorExtensionModule,
} from "../../types";
import { DiffDecorations } from "./diffDecorations";
import { diffDocs } from "./diff";
import styles from "./DiffView.module.css";

export interface DiffPaneVersion {
  id: string;
  label: string;
  at: number;
  json: JSONContent;
}

export interface DiffViewProps {
  /** Modules used to render content (diff view shares the live editor's pipeline). */
  modules: EditorExtensionModule[];
  /** Base context. Read-only is forced on inside this view. */
  context: EditorExtensionContext;
  left: DiffPaneVersion;
  right: DiffPaneVersion;
  onClose?: () => void;
}

export function DiffView({
  modules,
  context,
  left,
  right,
  onClose,
}: DiffViewProps) {
  const result = useMemo(
    () => diffDocs(left.json, right.json),
    [left.json, right.json],
  );

  const baseExtensions = useMemo(
    () => buildTiptapExtensions(modules, { ...context, readOnly: true }),
    [modules, context],
  );

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <span>
          Comparing <strong>{left.label}</strong> ↔{" "}
          <strong>{right.label}</strong>
        </span>
        {onClose && (
          <button className={styles.close} onClick={onClose} type="button">
            Close
          </button>
        )}
      </header>
      <div className={styles.panes}>
        <DiffPane
          title={left.label}
          subtitle={new Date(left.at).toLocaleString()}
          baseExtensions={baseExtensions}
          version={left}
          entries={result.left}
          side="left"
        />
        <DiffPane
          title={right.label}
          subtitle={new Date(right.at).toLocaleString()}
          baseExtensions={baseExtensions}
          version={right}
          entries={result.right}
          side="right"
        />
      </div>
    </div>
  );
}

interface DiffPaneProps {
  title: string;
  subtitle: string;
  baseExtensions: ReturnType<typeof buildTiptapExtensions>;
  version: DiffPaneVersion;
  entries: ReturnType<typeof diffDocs>["left"];
  side: "left" | "right";
}

function DiffPane({
  title,
  subtitle,
  baseExtensions,
  version,
  entries,
  side,
}: DiffPaneProps) {
  const extensions = useMemo(
    () => [...baseExtensions, DiffDecorations.configure({ entries })],
    [baseExtensions, entries],
  );

  const editor = useEditor(
    {
      extensions,
      content: version.json,
      editable: false,
      immediatelyRender: false,
      editorProps: {
        attributes: { class: styles.proseMirror },
      },
    },
    [extensions, version.id],
  );

  return (
    <section className={styles.pane} data-side={side}>
      <header className={styles.paneHeader}>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </header>
      <EditorContent editor={editor} className={styles.paneContent} />
    </section>
  );
}
