"use client";

import React, { useState, useRef, useEffect, type FormEvent } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import styles from "./FloatingCommentComposer.module.css";

interface Props {
  editor: Editor;
}

/**
 * Floating comment composer anchored to the current selection.
 * Appears when `editor.storage.comments.pendingComment === true` and
 * dismisses on submit, cancel, or Escape.
 */
export function FloatingCommentComposer({ editor }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea whenever pendingComment transitions to true
  useEffect(() => {
    const handler = () => {
      const storage = (editor.storage as Record<string, any>).comments;
      if (storage?.pendingComment) {
        // Small delay to let the BubbleMenu position itself first
        setTimeout(() => textareaRef.current?.focus(), 30);
      } else {
        setText("");
      }
    };
    editor.on("transaction", handler);
    return () => { editor.off("transaction", handler); };
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

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e }) => {
        const storage = (e.storage as Record<string, any>).comments;
        return storage?.pendingComment === true;
      }}
      options={{ placement: "bottom-start" }}
      updateDelay={0}
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
    </BubbleMenu>
  );
}
