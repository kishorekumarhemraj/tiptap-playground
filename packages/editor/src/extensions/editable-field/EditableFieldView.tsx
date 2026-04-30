"use client";

import { useState } from "react";
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

export function EditableFieldView({
  node,
  editor,
  updateAttributes,
}: NodeViewProps) {
  const storage = (
    editor.storage as { editableField?: EditableFieldExtensionStorage }
  ).editableField;
  const editorMode = storage?.editorMode ?? "document";
  const isTemplate = editorMode === "template" && editor.isEditable;
  const instruction = (node.attrs.instruction as string | null) ?? null;
  const placeholder =
    (node.attrs.placeholder as string | null) ??
    (editorMode === "document" ? "Write your response…" : "Editable region");

  const [draftInstruction, setDraftInstruction] = useState<string>(
    instruction ?? "",
  );

  return (
    <NodeViewWrapper
      as="div"
      className={`${styles.wrapper} ${isTemplate ? styles.templateMode : styles.documentMode}`}
      data-editable-field-id={(node.attrs.id as string | null) ?? undefined}
      data-placeholder={placeholder}
    >
      {isTemplate ? (
        <div className={styles.templateBar} contentEditable={false}>
          <span className={styles.chipInline}>
            <EditIcon />
            Editable
          </span>
          <input
            className={styles.instructionInput}
            type="text"
            value={draftInstruction}
            placeholder="Add instruction for document authors…"
            aria-label="Instruction for document authors"
            onChange={(e) => setDraftInstruction(e.target.value)}
            onBlur={(e) => {
              const next = e.target.value.trim() || null;
              const current = (node.attrs.instruction as string | null) ?? null;
              if (next !== current) {
                updateAttributes({ instruction: next });
              }
            }}
          />
        </div>
      ) : (
        <>
          <span className={styles.chip} contentEditable={false}>
            <EditIcon />
            Editable
          </span>
          {instruction && (
            <span className={styles.instruction} contentEditable={false}>
              {instruction}
            </span>
          )}
        </>
      )}
      <NodeViewContent
        className={styles.content}
        data-placeholder={placeholder}
      />
    </NodeViewWrapper>
  );
}
