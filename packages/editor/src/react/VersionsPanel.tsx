"use client";

import { useEffect, useState } from "react";
import type { VersionSnapshot } from "../drivers/version-store";
import type { VersionsPanelHandle } from "./EditorHandle";
import styles from "./VersionsPanel.module.css";

export interface VersionsPanelProps {
  /** Handle obtained from the `onEditor` callback on `<Editor />`. */
  editor: VersionsPanelHandle | null;
  diffSelection: { left: string | null; right: string | null };
  onChangeDiffSelection: (s: {
    left: string | null;
    right: string | null;
  }) => void;
  onCompare: (left: VersionSnapshot, right: VersionSnapshot) => void;
  /**
   * Called before a restore is executed. Return `false` (or a Promise
   * resolving to `false`) to cancel. When omitted a `window.confirm`
   * dialog is shown instead. Hosts in regulated contexts should supply
   * their own confirmation UI so the confirmation itself is auditable.
   */
  onBeforeRestore?: (snapshot: VersionSnapshot) => boolean | Promise<boolean>;
  /**
   * Called when the user clicks "Preview" on a version. The host should
   * show a DiffView comparing the snapshot against the current document
   * and offer a Restore button. If not provided, the Preview button is hidden.
   */
  onPreviewRestore?: (snapshot: VersionSnapshot) => void;
  /**
   * When true, renders without the outer `<aside>` wrapper and header.
   * Use this when embedding the panel inside a tabbed host container.
   */
  embedded?: boolean;
  className?: string;
}

export function VersionsPanel({
  editor,
  diffSelection,
  onChangeDiffSelection,
  onCompare,
  onBeforeRestore,
  onPreviewRestore,
  embedded,
  className,
}: VersionsPanelProps) {
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);

  useEffect(() => {
    if (!editor) return;
    return editor.subscribe(setSnapshots);
  }, [editor]);

  if (!editor) {
    if (embedded) return null;
    return (
      <aside
        className={`${styles.panel} ${className ?? ""}`.trim()}
        aria-busy="true"
      />
    );
  }

  const toggleSelect = (id: string) => {
    const { left, right } = diffSelection;
    if (left === id) {
      onChangeDiffSelection({ left: right, right: null });
      return;
    }
    if (right === id) {
      onChangeDiffSelection({ left, right: null });
      return;
    }
    if (!left) onChangeDiffSelection({ left: id, right });
    else if (!right) onChangeDiffSelection({ left, right: id });
    else onChangeDiffSelection({ left: id, right });
  };

  const handleRestore = async (snapshot: VersionSnapshot) => {
    const confirm_ =
      onBeforeRestore ??
      ((s: VersionSnapshot) =>
        window.confirm(
          `Restore "${s.label}"?\n\nThis will replace the current document. This action cannot be undone.`,
        ));
    const ok = await confirm_(snapshot);
    if (ok) editor?.restoreVersion(snapshot.id);
  };

  const findSnapshot = (id: string | null) =>
    id ? snapshots.find((s) => s.id === id) ?? null : null;

  const canCompare =
    diffSelection.left &&
    diffSelection.right &&
    diffSelection.left !== diffSelection.right;

  const content = (
    <>
      {!embedded && (
        <header className={styles.header}>
          <span className={styles.headerTitle}>Versions</span>
          <span className={styles.count}>{snapshots.length}</span>
        </header>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          disabled={!canCompare}
          onClick={() => {
            const left = findSnapshot(diffSelection.left);
            const right = findSnapshot(diffSelection.right);
            if (left && right) onCompare(left, right);
          }}
        >
          Compare selected
        </button>
      </div>

      {snapshots.length === 0 ? (
        <p className={styles.empty}>
          No versions saved yet. Use <kbd>Save version</kbd> above.
        </p>
      ) : (
        <ul className={styles.list}>
          {snapshots.map((s) => {
            const checked =
              diffSelection.left === s.id || diffSelection.right === s.id;
            return (
              <li key={s.id} className={styles.item} data-selected={checked}>
                <label className={styles.itemHeader}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelect(s.id)}
                  />
                  <span className={styles.label}>{s.label}</span>
                </label>
                <div className={styles.meta}>
                  {new Date(s.at).toLocaleString()} · {s.by.name}
                </div>
                <div className={styles.itemActions}>
                  {onPreviewRestore && (
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => onPreviewRestore(s)}
                      title="Preview differences before restoring"
                    >
                      Preview
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => void handleRestore(s)}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    className={`${styles.linkButton} ${styles.linkButtonDanger}`}
                    onClick={() => editor.deleteVersion(s.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  if (embedded) {
    return <div className={`${styles.embeddedPanel} ${className ?? ""}`.trim()}>{content}</div>;
  }

  return (
    <aside className={`${styles.panel} ${className ?? ""}`.trim()}>
      {content}
    </aside>
  );
}
