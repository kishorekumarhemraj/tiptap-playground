"use client";

import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import type { LockMode, LockedBlockStorage } from "./LockedBlock";
import styles from "./LockedBlockView.module.css";

const modeLabel: Record<LockMode, string> = {
  locked: "Locked",
  readonly: "Read-only",
  conditional: "Conditional",
};

function LockIcon({ mode }: { mode: LockMode }) {
  if (mode === "readonly") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M1.5 8C2.6 5 5 3 8 3s5.4 2 6.5 5c-1.1 3-3.5 5-6.5 5s-5.4-2-6.5-5z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="8" cy="8" r="1.75" fill="currentColor" />
      </svg>
    );
  }
  if (mode === "conditional") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M9 1.5 3 9h4l-1 5.5L12 7H8l1-5.5z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.2"
        y="7.2"
        width="9.6"
        height="6.6"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5.2 7.2V5a2.8 2.8 0 0 1 5.6 0v2.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function LockedBlockView({ node, editor, updateAttributes }: NodeViewProps) {
  const mode = node.attrs.mode as LockMode;
  const reason = node.attrs.reason as string | null;
  const condition = node.attrs.condition as string | null;
  const lockedBy = node.attrs.lockedBy as string | null;
  const storage = (editor.storage as { lockedBlock?: LockedBlockStorage })
    .lockedBlock;
  const editorMode = storage?.editorMode ?? "document";
  // The lock-mode selector is an authoring affordance. Hide it in
  // document mode — the guard would reject the change anyway, and
  // the UI should match the policy.
  const showControls = editor.isEditable && editorMode === "template";

  const tooltipParts = [modeLabel[mode]];
  if (lockedBy) tooltipParts.push(`by ${lockedBy}`);
  if (reason) tooltipParts.push(reason);
  if (mode === "conditional" && condition) tooltipParts.push(`when: ${condition}`);
  const tooltip = tooltipParts.join(" · ");

  return (
    <NodeViewWrapper
      as="div"
      data-mode={mode}
      data-editor-mode={editorMode}
      className={styles.wrapper}
    >
      <span
        className={styles.marker}
        contentEditable={false}
        title={tooltip}
        aria-label={tooltip}
      >
        <LockIcon mode={mode} />
      </span>
      <NodeViewContent className={styles.content} />
      {showControls && (
        <span className={styles.controls} contentEditable={false}>
          <select
            className={styles.modeSelect}
            value={mode}
            onChange={(e) =>
              updateAttributes({ mode: e.target.value as LockMode })
            }
            title="Change lock mode"
          >
            <option value="locked">locked</option>
            <option value="readonly">read-only</option>
            <option value="conditional">conditional</option>
          </select>
        </span>
      )}
    </NodeViewWrapper>
  );
}
