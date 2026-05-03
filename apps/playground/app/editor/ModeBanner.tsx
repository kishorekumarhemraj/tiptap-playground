"use client";

import type { EditorMode } from "@tiptap-playground/editor";
import styles from "./ModeBanner.module.css";

interface ModeBannerProps {
  mode: EditorMode;
}

export function ModeBanner({ mode }: ModeBannerProps) {
  const isTemplate = mode === "template";
  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <div className={styles.modeIcon}>
        {isTemplate ? <PenIcon /> : <PageIcon />}
      </div>
      <span className={styles.modeLabel}>
        {isTemplate ? "Template Design Mode" : "Document Authoring Mode"}
      </span>
      <span className={styles.modeDescription}>
        {isTemplate
          ? "— Define sections, editable regions, and block instructions. Authors cannot change structure."
          : "— Fill in editable regions. Locked sections are enforced by the template."}
      </span>
    </div>
  );
}

function PenIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.5 2.5l2 2L6 12H4v-2L11.5 2.5z"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PageIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 2h6l4 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M10 2v4h4" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
