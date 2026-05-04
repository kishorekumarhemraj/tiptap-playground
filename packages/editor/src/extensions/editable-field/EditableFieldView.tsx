"use client";

import { useState } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import type { EditableFieldExtensionStorage } from "./EditableField";
import styles from "./EditableFieldView.module.css";

function EditIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.5 2.5l2 2L6 12H4v-2L11.5 2.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
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
        /* ── Template bar: "Editable Field" chip + instruction input ── */
        <div className={styles.templateBar} contentEditable={false}>
          <span className={styles.chipInline}>
            <EditIcon size={11} />
            Editable Field
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
          {/* Floating "Editable Field" label at top-left (visible always) */}
          <span className={styles.chip} contentEditable={false}>
            Editable Field
          </span>

          {/* Pen + "Edit" affordance at top-right — fades in on hover, out on focus */}
          <span className={styles.editHint} contentEditable={false} aria-hidden="true">
            <EditIcon size={10} />
            Edit
          </span>

          {/* Instruction banner */}
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
