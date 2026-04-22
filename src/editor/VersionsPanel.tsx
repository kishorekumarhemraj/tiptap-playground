"use client";

import { useEffect, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type { VersionSnapshot } from "./extensions/versioning";
import styles from "./VersionsPanel.module.css";

export interface VersionsPanelProps {
  editor: TiptapEditor | null;
  /** Currently selected versions for diffing. */
  diffSelection: { left: string | null; right: string | null };
  onChangeDiffSelection: (s: {
    left: string | null;
    right: string | null;
  }) => void;
  onCompare: (left: VersionSnapshot, right: VersionSnapshot) => void;
}

export function VersionsPanel({
  editor,
  diffSelection,
  onChangeDiffSelection,
  onCompare,
}: VersionsPanelProps) {
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);

  useEffect(() => {
    if (!editor) return;
    const storage = editor.storage.versioning;
    if (!storage) return;
    return storage.subscribe(setSnapshots);
  }, [editor]);

  if (!editor) {
    return <aside className={styles.panel} aria-busy="true" />;
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

  const findSnapshot = (id: string | null) =>
    id ? snapshots.find((s) => s.id === id) ?? null : null;

  const canCompare =
    diffSelection.left && diffSelection.right && diffSelection.left !== diffSelection.right;

  return (
    <aside className={styles.panel}>
      <header className={styles.header}>
        <strong>Versions</strong>
        <span className={styles.count}>{snapshots.length}</span>
      </header>

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
          No versions yet. Use <kbd>💾 Save version</kbd> in the toolbar.
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
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() =>
                      editor.chain().focus().restoreVersion(s.id).run()
                    }
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() =>
                      editor.chain().focus().deleteVersion(s.id).run()
                    }
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
