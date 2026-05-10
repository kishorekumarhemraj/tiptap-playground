"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import type { EditorState } from "@tiptap/pm/state";
import { IconBold, IconItalic, IconUnderline, IconComment } from "./icons";
import styles from "./FloatingToolbar.module.css";

interface Props {
  editor: Editor;
  hasComments: boolean;
}

/**
 * Floating mini-toolbar that appears above selected text.
 * Shows basic inline formatting + the Comment action.
 */
export function FloatingToolbar({ editor, hasComments }: Props) {
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e, state }: { editor: Editor; state: EditorState }) => {
        const { empty } = state.selection;
        if (empty) return false;
        if (e.isActive("codeBlock")) return false;
        // Hide while the comment composer popover is open
        const commentStorage = (e.storage as Record<string, any>).comments;
        if (commentStorage?.pendingComment) return false;
        return true;
      }}
    >
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.btn} ${editor.isActive("bold") ? styles.active : ""}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
          title="Bold"
        >
          <IconBold />
        </button>
        <button
          type="button"
          className={`${styles.btn} ${editor.isActive("italic") ? styles.active : ""}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
          title="Italic"
        >
          <IconItalic />
        </button>
        <button
          type="button"
          className={`${styles.btn} ${editor.isActive("underline") ? styles.active : ""}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
          title="Underline"
        >
          <IconUnderline />
        </button>

        {hasComments && (
          <>
            <span className={styles.divider} />
            <button
              type="button"
              className={styles.btn}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.commands.startPendingComment()}
              aria-label="Add comment"
              title="Add comment (C)"
            >
              <IconComment />
              <span className={styles.btnLabel}>Comment</span>
            </button>
          </>
        )}
      </div>
    </BubbleMenu>
  );
}
