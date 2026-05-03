"use client";

import { useState } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import type { SectionExtensionStorage } from "./Section";
import styles from "./SectionView.module.css";

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={styles.gripIcon}>
      <circle cx="5.5" cy="5" r="1.1" fill="currentColor" />
      <circle cx="5.5" cy="8" r="1.1" fill="currentColor" />
      <circle cx="5.5" cy="11" r="1.1" fill="currentColor" />
      <circle cx="10.5" cy="5" r="1.1" fill="currentColor" />
      <circle cx="10.5" cy="8" r="1.1" fill="currentColor" />
      <circle cx="10.5" cy="11" r="1.1" fill="currentColor" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="11" height="11">
      <rect x="3.5" y="7" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="11" height="11">
      <rect x="3.5" y="7" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SectionChip() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={styles.chipIcon}>
      <path d="M2.5 4h11M2.5 7.5h11M2.5 11h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SectionView({
  node,
  editor,
  updateAttributes,
}: NodeViewProps) {
  const storage = (editor.storage as { section?: SectionExtensionStorage }).section;
  const editorMode = storage?.editorMode ?? "document";
  const isTemplate = editorMode === "template" && editor.isEditable;

  const title = (node.attrs.title as string | null) ?? null;
  const instruction = (node.attrs.instruction as string | null) ?? null;
  const mutableContent = node.attrs.mutableContent === true;
  const sectionId = (node.attrs.id as string | null) ?? null;

  const [draftTitle, setDraftTitle] = useState<string>(title ?? "");
  const [draftInstruction, setDraftInstruction] = useState<string>(instruction ?? "");
  const [hovered, setHovered] = useState(false);

  return (
    <NodeViewWrapper
      as="section"
      className={`${styles.wrapper} ${isTemplate ? styles.templateMode : styles.documentMode}`}
      data-section-id={sectionId ?? undefined}
      data-mutable-content={mutableContent ? "true" : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isTemplate ? (
        <header className={styles.header} contentEditable={false}>
          {/* Left accent + grip */}
          <div className={styles.headerLeft}>
            <GripIcon />
          </div>

          {/* Title + instruction */}
          <div className={styles.titleArea}>
            <div className={styles.titleRow}>
              <SectionChip />
              <input
                className={styles.titleInput}
                type="text"
                value={draftTitle}
                placeholder="Untitled section"
                aria-label="Section title"
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={(e) => {
                  const next = e.target.value.trim() || null;
                  const current = (node.attrs.title as string | null) ?? null;
                  if (next !== current) updateAttributes({ title: next });
                }}
              />
            </div>
            <div className={styles.instructionRow}>
              <span className={styles.instructionIcon} aria-hidden="true">💡</span>
              <input
                className={styles.instructionInput}
                type="text"
                value={draftInstruction}
                placeholder="Add a hint for document authors…"
                aria-label="Instruction for document authors"
                onChange={(e) => setDraftInstruction(e.target.value)}
                onBlur={(e) => {
                  const next = e.target.value.trim() || null;
                  const current = (node.attrs.instruction as string | null) ?? null;
                  if (next !== current) updateAttributes({ instruction: next });
                }}
              />
            </div>
          </div>

          {/* Mutable toggle */}
          <button
            type="button"
            className={`${styles.mutabilityToggle} ${mutableContent ? styles.mutable : styles.fixed}`}
            onClick={() => updateAttributes({ mutableContent: !mutableContent })}
            title={
              mutableContent
                ? "Open: document authors can add/remove blocks"
                : "Fixed: document structure is locked"
            }
            aria-pressed={mutableContent}
          >
            {mutableContent ? <UnlockIcon /> : <LockIcon />}
            <span>{mutableContent ? "Open" : "Fixed"}</span>
          </button>
        </header>
      ) : (
        /* Document mode: subtle left-bar accent + hover chip */
        hovered && (
          <div className={styles.hoverChip} contentEditable={false}>
            <SectionChip />
            <span className={styles.hoverChipText}>{title ?? "Section"}</span>
            {mutableContent && (
              <span className={styles.hoverOpenBadge}>Open</span>
            )}
          </div>
        )
      )}

      <NodeViewContent className={styles.content} />
    </NodeViewWrapper>
  );
}
