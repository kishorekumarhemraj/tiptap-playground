"use client";

import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import type { EditableFieldExtensionStorage } from "./EditableField";
import styles from "./EditableFieldView.module.css";

function EditIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 14h2.8L13 5.8 10.2 3 2 11.2V14z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M9 4l3 3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function EditableFieldView({ node, editor }: NodeViewProps) {
  const storage = (
    editor.storage as { editableField?: EditableFieldExtensionStorage }
  ).editableField;
  const editorMode = storage?.editorMode ?? "document";
  const isTemplate = editorMode === "template" && editor.isEditable;
  const instruction = (node.attrs.instruction as string | null) ?? null;
  const placeholder =
    (node.attrs.placeholder as string | null) ??
    (editorMode === "document" ? "Write your response…" : "Editable region");

  return (
    <NodeViewWrapper
      as="div"
      className={`${styles.wrapper} ${isTemplate ? styles.templateMode : styles.documentMode}`}
      data-editable-field-id={(node.attrs.id as string | null) ?? undefined}
      data-placeholder={placeholder}
    >
      <span className={styles.chip} contentEditable={false}>
        <EditIcon />
        Editable
      </span>
      {instruction && (
        <span className={styles.instruction} contentEditable={false}>
          {instruction}
        </span>
      )}
      <NodeViewContent
        className={styles.content}
        data-placeholder={placeholder}
      />
    </NodeViewWrapper>
  );
}
