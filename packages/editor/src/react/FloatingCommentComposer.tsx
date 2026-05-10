"use client";

import React, { useState, useRef, useEffect, type FormEvent } from "react";
import type { Editor } from "@tiptap/react";
import styles from "./FloatingCommentComposer.module.css";

interface Props {
  editor: Editor;
}

interface Position {
  top: number;
  left: number;
}

/**
 * Inline comment composer anchored to the current text selection.
 *
 * Uses a fixed-position overlay driven by React state rather than BubbleMenu,
 * because BubbleMenu skips re-evaluation on meta-only transactions (like
 * startPendingComment which doesn't change the doc or selection).
 */
export function FloatingCommentComposer({ editor }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position>({ top: 0, left: 0 });
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = () => {
      const storage = (editor.storage as Record<string, any>).comments;
      if (storage?.pendingComment) {
        const { from, to } = editor.state.selection;
        const anchor = Math.min(from, to);
        const coords = editor.view.coordsAtPos(anchor);
        setPos({ top: coords.bottom + 8, left: coords.left });
        setOpen(true);
        setTimeout(() => textareaRef.current?.focus(), 30);
      } else {
        setOpen(false);
        setText("");
      }
    };
    editor.on("transaction", handler);
    return () => {
      editor.off("transaction", handler);
    };
  }, [editor]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    editor.commands.createCommentThread(trimmed);
    setText("");
  };

  const cancel = () => {
    setText("");
    editor.commands.cancelPendingComment();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      style={{ top: pos.top, left: pos.left }}
    >
      <form className={styles.composer} onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          placeholder="Add a comment…"
          value={text}
          rows={3}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") cancel();
          }}
        />
        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!text.trim()}
          >
            Comment
          </button>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={cancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
