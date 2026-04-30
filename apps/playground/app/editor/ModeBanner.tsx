"use client";

import type { EditorMode } from "@tiptap-playground/editor";
import styles from "./ModeBanner.module.css";

interface ModeBannerProps {
  mode: EditorMode;
}

export function ModeBanner({ mode }: ModeBannerProps) {
  return (
    <div
      className={`${styles.banner} ${mode === "template" ? styles.template : styles.document}`}
      role="status"
      aria-live="polite"
    >
      {mode === "template" ? (
        <>
          <span className={styles.icon} aria-hidden="true">✏️</span>
          <span>
            <strong>Template Design Mode</strong> — You&apos;re designing a reusable
            template. Add sections, editable regions, and form fields. Authors
            will fill in the editable regions but cannot change the structure.
          </span>
        </>
      ) : (
        <>
          <span className={styles.icon} aria-hidden="true">📄</span>
          <span>
            <strong>Document Mode</strong> — Fill in the highlighted editable
            regions below. The document structure is fixed by the template and
            cannot be changed.
          </span>
        </>
      )}
    </div>
  );
}
