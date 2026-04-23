"use client";

import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import type { LockMode } from "./LockedBlock";
import styles from "./LockedBlockView.module.css";

const modeLabel: Record<LockMode, string> = {
  locked: "Locked",
  readonly: "Read-only",
  conditional: "Conditional",
};

export function LockedBlockView({ node, editor, updateAttributes }: NodeViewProps) {
  const mode = node.attrs.mode as LockMode;
  const reason = node.attrs.reason as string | null;
  const condition = node.attrs.condition as string | null;
  const lockedBy = node.attrs.lockedBy as string | null;
  const canEdit = editor.isEditable;

  return (
    <NodeViewWrapper
      as="div"
      data-mode={mode}
      className={styles.wrapper}
      contentEditable={false}
    >
      <header className={styles.header}>
        <span className={styles.badge}>{modeLabel[mode]}</span>
        {lockedBy && (
          <span className={styles.meta}>by {lockedBy}</span>
        )}
        {reason && <span className={styles.reason}>· {reason}</span>}
        {mode === "conditional" && condition && (
          <code className={styles.condition}>when: {condition}</code>
        )}
        {canEdit && (
          <div className={styles.actions}>
            <select
              className={styles.modeSelect}
              value={mode}
              onChange={(e) =>
                updateAttributes({ mode: e.target.value as LockMode })
              }
            >
              <option value="locked">locked</option>
              <option value="readonly">read-only</option>
              <option value="conditional">conditional</option>
            </select>
          </div>
        )}
      </header>
      <NodeViewContent className={styles.content} />
    </NodeViewWrapper>
  );
}
