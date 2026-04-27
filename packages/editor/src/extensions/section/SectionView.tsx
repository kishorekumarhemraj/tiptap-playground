"use client";

import { useState } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import type { SectionExtensionStorage } from "./Section";
import styles from "./SectionView.module.css";

function SectionIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={styles.icon}
    >
      <path
        d="M2.5 3h11M2.5 6.5h11M2.5 10h7.5M2.5 13.5h11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SectionView({
  node,
  editor,
  updateAttributes,
}: NodeViewProps) {
  const storage = (editor.storage as { section?: SectionExtensionStorage })
    .section;
  const editorMode = storage?.editorMode ?? "document";
  const isTemplate = editorMode === "template" && editor.isEditable;

  const title = (node.attrs.title as string | null) ?? null;
  const instruction = (node.attrs.instruction as string | null) ?? null;
  const mutableContent = node.attrs.mutableContent === true;
  const sectionId = (node.attrs.id as string | null) ?? null;

  const [draftTitle, setDraftTitle] = useState<string>(title ?? "");

  return (
    <NodeViewWrapper
      as="section"
      className={styles.wrapper}
      data-section-id={sectionId ?? undefined}
      data-mutable-content={mutableContent ? "true" : undefined}
    >
      <header className={styles.header} contentEditable={false}>
        <SectionIcon />
        <div className={styles.titleArea}>
          {isTemplate ? (
            <input
              className={styles.titleInput}
              type="text"
              value={draftTitle}
              placeholder="Section title"
              aria-label="Section title"
              onChange={(e) => {
                setDraftTitle(e.target.value);
                updateAttributes({
                  title: e.target.value.trim() ? e.target.value : null,
                });
              }}
            />
          ) : title ? (
            <span className={styles.title}>{title}</span>
          ) : (
            <span className={styles.titlePlaceholder}>Untitled section</span>
          )}
          {instruction && (
            <span className={styles.instruction}>{instruction}</span>
          )}
        </div>
        <div className={styles.badges}>
          {isTemplate ? (
            <button
              type="button"
              className={`${styles.badge} ${styles.badgeButton}`}
              data-active={mutableContent ? "true" : undefined}
              onClick={() =>
                updateAttributes({ mutableContent: !mutableContent })
              }
              title={
                mutableContent
                  ? "Users may add blocks inside this section"
                  : "Section content is fixed in documents"
              }
            >
              {mutableContent ? "Mutable" : "Fixed"}
            </button>
          ) : mutableContent ? (
            <span
              className={styles.badge}
              data-active="true"
              title="You may add blocks inside this section"
            >
              Open
            </span>
          ) : null}
        </div>
      </header>
      <NodeViewContent className={styles.content} />
    </NodeViewWrapper>
  );
}
