"use client";

import DragHandle from "@tiptap/extension-drag-handle-react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import styles from "./DragHandle.module.css";

export interface TemplateDragHandleProps {
  editor: TiptapEditor | null;
}

function GripIcon() {
  return (
    <svg viewBox="0 0 12 14" fill="none" aria-hidden="true">
      <circle cx="3.5" cy="3" r="1.1" fill="currentColor" />
      <circle cx="8.5" cy="3" r="1.1" fill="currentColor" />
      <circle cx="3.5" cy="7" r="1.1" fill="currentColor" />
      <circle cx="8.5" cy="7" r="1.1" fill="currentColor" />
      <circle cx="3.5" cy="11" r="1.1" fill="currentColor" />
      <circle cx="8.5" cy="11" r="1.1" fill="currentColor" />
    </svg>
  );
}

/**
 * Floating drag grip rendered to the left of the hovered block.
 * Wraps `@tiptap/extension-drag-handle-react` with our visual style
 * and allows nested handling (lists, blockquotes).
 *
 * The host decides when to mount this — typically only in template
 * mode, where the structure is editable. In document mode the
 * structure is frozen so the handle would be misleading.
 */
export function TemplateDragHandle({ editor }: TemplateDragHandleProps) {
  if (!editor) return null;
  return (
    <DragHandle
      editor={editor}
      nested
      computePositionConfig={{ placement: "left-start", strategy: "absolute" }}
    >
      <div className={styles.handle} aria-label="Drag block">
        <GripIcon />
      </div>
    </DragHandle>
  );
}
