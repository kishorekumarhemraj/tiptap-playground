"use client";

import { useState } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import type { SectionExtensionStorage } from "./Section";
import styles from "./SectionView.module.css";

/* ── Icons ─────────────────────────────────────────────────────────────── */

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={styles.gripIcon}>
      <circle cx="5.5" cy="5"  r="1" fill="currentColor" />
      <circle cx="10.5" cy="5"  r="1" fill="currentColor" />
      <circle cx="5.5" cy="8"  r="1" fill="currentColor" />
      <circle cx="10.5" cy="8"  r="1" fill="currentColor" />
      <circle cx="5.5" cy="11" r="1" fill="currentColor" />
      <circle cx="10.5" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

function SectionIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={styles.sectionIcon}>
      <rect x="2" y="2" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="8" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 1.2" />
    </svg>
  );
}

function InfoIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <line x1="8" y1="7.5" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M11.5 2.5l2 2L6 12H4v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="4" y="8" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 8V6a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 5h8M6 5V4h4v1M5 5l.5 8h5l.5-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Component ─────────────────────────────────────────────────────────── */

export function SectionView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const storage = (editor.storage as { section?: SectionExtensionStorage }).section;
  const editorMode = storage?.editorMode ?? "document";
  const isTemplate = editorMode === "template" && editor.isEditable;

  const title          = (node.attrs.title as string | null) ?? null;
  const instruction    = (node.attrs.instruction as string | null) ?? null;
  const mutableContent = node.attrs.mutableContent === true;
  const sectionId      = (node.attrs.id as string | null) ?? null;

  // Audit metadata (stamped by the block-audit extension). May be null
  // for sections persisted before the extension was added; fall back to
  // hiding the chip rather than rendering "Anonymous · just now".
  const createdByName  = (node.attrs.createdByName as string | null) ?? null;
  const createdAt      = (node.attrs.createdAt as number | null) ?? null;
  const modifiedByName = (node.attrs.modifiedByName as string | null) ?? null;
  const modifiedAt     = (node.attrs.modifiedAt as number | null) ?? null;

  const [draftTitle,       setDraftTitle]       = useState<string>(title ?? "");
  const [draftInstruction, setDraftInstruction] = useState<string>(instruction ?? "");

  return (
    <NodeViewWrapper
      as="section"
      className={`${styles.wrapper} ${isTemplate ? styles.templateMode : `tpe-section ${styles.documentMode}`}`}
      data-section-id={sectionId ?? undefined}
      data-mutable-content={mutableContent ? "true" : undefined}
    >
      {isTemplate ? (
        /* ── Template header ── */
        <header className={styles.header} contentEditable={false}>

          {/* Drag grip — opacity toggled by CSS :hover on parent */}
          <div className={styles.headerLeft}>
            <GripIcon />
          </div>

          {/* Title area */}
          <div className={styles.titleArea}>
            <SectionIcon />
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
            {mutableContent && (
              <span className={styles.mutableBadge}>Open for editing</span>
            )}
          </div>

          {/* Controls — opacity toggled by CSS :hover on parent */}
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.controlBtn}
              title="Edit section title"
              aria-label="Edit section title"
              onClick={() => {
                // Focus the title input in this section header
                const wrapper = document.querySelector(
                  `[data-section-id="${sectionId}"]`,
                );
                const input = wrapper?.querySelector(
                  `.${styles.titleInput}`,
                ) as HTMLInputElement | null;
                input?.focus();
                input?.select();
              }}
            >
              <PenIcon />
            </button>
            <button
              type="button"
              className={`${styles.controlBtn} ${mutableContent ? styles.controlBtnActive : ""}`}
              title={mutableContent ? "Lock — authors cannot add or remove content" : "Unlock — allow authors to add content"}
              aria-label={mutableContent ? "Lock section" : "Unlock section"}
              aria-pressed={mutableContent}
              onClick={() => {
                updateAttributes({ mutableContent: !mutableContent });
              }}
            >
              <LockIcon />
            </button>
            <button
              type="button"
              className={styles.controlBtn}
              title="Add paragraph inside section"
              aria-label="Add paragraph"
              onClick={() => {
                // Insert a paragraph at the end of this section
                const pos = getPos();
                if (typeof pos !== "number") return;
                const sectionNode = editor.state.doc.nodeAt(pos);
                if (!sectionNode) return;
                const insertPos = pos + sectionNode.nodeSize - 1;
                const paragraph = editor.state.schema.nodes.paragraph?.create();
                if (!paragraph) return;
                const tr = editor.state.tr.insert(insertPos, paragraph);
                // Place cursor in the new paragraph
                tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
                editor.view.dispatch(tr);
                editor.view.focus();
              }}
            >
              <PlusIcon />
            </button>
            <button
              type="button"
              className={`${styles.controlBtn} ${styles.controlBtnDanger}`}
              title="Delete section"
              aria-label="Delete section"
              onClick={() => {
                // Delete this section
                const pos = getPos();
                if (typeof pos !== "number") return;
                const sectionNode = editor.state.doc.nodeAt(pos);
                if (!sectionNode) return;
                const tr = editor.state.tr.delete(
                  pos,
                  pos + sectionNode.nodeSize,
                );
                editor.view.dispatch(tr);
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </header>
      ) : (
        /* ── Document mode: floating label + lock icon (opacity via CSS) ── */
        <>
          <div className={styles.docLabel} contentEditable={false}>
            <span className={styles.docLabelText}>{title ?? "Section"}</span>
          </div>
          {(modifiedByName || createdByName) && (
            <AuditChip
              createdByName={createdByName}
              createdAt={createdAt}
              modifiedByName={modifiedByName}
              modifiedAt={modifiedAt}
            />
          )}
          {!mutableContent && (
            <div className={styles.docLock} contentEditable={false}>
              <LockIcon size={12} />
            </div>
          )}
        </>
      )}

      {/* Instruction — template: editable input row; document: blue info banner */}
      {isTemplate && (
        <div className={styles.instructionRow} contentEditable={false}>
          <span className={styles.instructionPill}>
            <InfoIcon size={11} />
            Instruction
          </span>
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
      )}

      {instruction && !isTemplate && (
        <InstructionBanner text={instruction} />
      )}

      <NodeViewContent className={styles.content} />
    </NodeViewWrapper>
  );
}

/* ── Instruction banner (document mode) ──────────────────────────────────── */

function InstructionBanner({ text }: { text: string }) {
  return (
    <div
      className="tpe-instruction-banner"
      contentEditable={false}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
        padding: "6px 10px",
        marginBottom: 6,
        background: "var(--blue-soft, rgba(37,99,235,.10))",
        borderRadius: "var(--r-md, 6px)",
        border: "1px solid rgba(37,99,235,.15)",
        fontSize: 12,
        color: "#3b5ea6",
        lineHeight: 1.4,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"
        style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="8" cy="8" r="6" stroke="#3b5ea6" strokeWidth="1.4" />
        <line x1="8" y1="7.5" x2="8" y2="11.5" stroke="#3b5ea6" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="5.5" r="0.75" fill="#3b5ea6" />
      </svg>
      <span>{text}</span>
    </div>
  );
}

/* ── Audit chip (document mode) ──────────────────────────────────────────── */

interface AuditChipProps {
  createdByName: string | null;
  createdAt: number | null;
  modifiedByName: string | null;
  modifiedAt: number | null;
}

function AuditChip({
  createdByName,
  createdAt,
  modifiedByName,
  modifiedAt,
}: AuditChipProps) {
  // Tooltip is the full provenance; the visible chip is a short summary.
  const isModified =
    modifiedAt && createdAt && modifiedAt > createdAt + 1000; // 1s tolerance
  const summary = isModified
    ? `Edited by ${modifiedByName ?? "—"} · ${formatRelativeTime(modifiedAt!)}`
    : createdAt
      ? `Created by ${createdByName ?? "—"} · ${formatRelativeTime(createdAt)}`
      : null;
  if (!summary) return null;

  const tooltipLines: string[] = [];
  if (createdByName && createdAt) {
    tooltipLines.push(`Created by ${createdByName} on ${formatAbsoluteTime(createdAt)}`);
  }
  if (isModified && modifiedByName && modifiedAt) {
    tooltipLines.push(`Last edited by ${modifiedByName} on ${formatAbsoluteTime(modifiedAt)}`);
  }

  return (
    <div
      className={styles.auditChip}
      contentEditable={false}
      title={tooltipLines.join("\n")}
      aria-label={tooltipLines.join(". ")}
    >
      {summary}
    </div>
  );
}

function formatRelativeTime(ms: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60)  return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
}

function formatAbsoluteTime(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}
