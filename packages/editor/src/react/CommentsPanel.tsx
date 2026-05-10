"use client";

import React, {
  useEffect,
  useState,
  useRef,
  type FormEvent,
} from "react";
import type { Editor } from "@tiptap/react";
import type { ThreadData, CommentData, ThreadStore } from "../drivers/thread-store";
import styles from "./CommentsPanel.module.css";

interface CommentsPanelProps {
  editor: Editor | null;
  threadStore: ThreadStore;
  userId: string;
}

/**
 * Sidebar panel that lists all open comment threads and a floating
 * composer that appears when `editor.storage.comments.pendingComment` is
 * true (triggered by the toolbar "Comment" button).
 */
export function CommentsPanel({
  editor,
  threadStore,
  userId,
}: CommentsPanelProps) {
  const [threads, setThreads] = useState<Map<string, ThreadData>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return threadStore.subscribe((t) => setThreads(new Map(t)));
  }, [threadStore]);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const s = (editor.storage as Record<string, any>).comments;
      if (!s) return;
      setSelectedId(s.selectedThreadId ?? null);
      setPending(s.pendingComment ?? false);
    };
    update();
    editor.on("transaction", update);
    return () => { editor.off("transaction", update); };
  }, [editor]);

  const visibleThreads = Array.from(threads.values()).filter(
    (t) => !t.deletedAt,
  );
  const openThreads = visibleThreads.filter((t) => !t.resolved);
  const resolvedThreads = visibleThreads.filter((t) => t.resolved);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Comments</span>
        <span className={styles.count}>{openThreads.length}</span>
      </div>

      {pending && editor && (
        <ComposerCard
          editor={editor}
          onSubmit={(body) => {
            editor.commands.createCommentThread(body);
          }}
          onCancel={() => editor.commands.cancelPendingComment()}
        />
      )}

      {openThreads.length === 0 && !pending && (
        <p className={styles.empty}>
          Select text and click <strong>Comment</strong> to start a discussion.
        </p>
      )}

      {openThreads.map((t) => (
        <ThreadCard
          key={t.id}
          thread={t}
          isSelected={t.id === selectedId}
          userId={userId}
          threadStore={threadStore}
          onSelect={() => {
            editor?.commands.selectThread(t.id === selectedId ? null : t.id);
          }}
        />
      ))}

      {resolvedThreads.length > 0 && (
        <details className={styles.resolvedSection}>
          <summary className={styles.resolvedToggle}>
            Resolved ({resolvedThreads.length})
          </summary>
          {resolvedThreads.map((t) => (
            <ThreadCard
              key={t.id}
              thread={t}
              isSelected={t.id === selectedId}
              userId={userId}
              threadStore={threadStore}
              onSelect={() =>
                editor?.commands.selectThread(t.id === selectedId ? null : t.id)
              }
            />
          ))}
        </details>
      )}
    </div>
  );
}

// ─── ThreadCard ───────────────────────────────────────────────────────────────

function ThreadCard({
  thread,
  isSelected,
  userId,
  threadStore,
  onSelect,
}: {
  thread: ThreadData;
  isSelected: boolean;
  userId: string;
  threadStore: ThreadStore;
  onSelect: () => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const activeComments = thread.comments.filter((c) => !c.deletedAt);

  return (
    <div
      className={`${styles.thread} ${isSelected ? styles.threadSelected : ""}`}
      onClick={onSelect}
    >
      {activeComments.map((c) => (
        <CommentRow
          key={c.id}
          comment={c}
          currentUserId={userId}
          onDelete={() =>
            threadStore.deleteComment({ threadId: thread.id, commentId: c.id })
          }
        />
      ))}

      <div className={styles.threadActions}>
        <button
          className={styles.actionBtn}
          onClick={(e) => {
            e.stopPropagation();
            if (thread.resolved) {
              threadStore.unresolveThread({ threadId: thread.id });
            } else {
              threadStore.resolveThread({ threadId: thread.id });
            }
          }}
        >
          {thread.resolved ? "Unresolve" : "Resolve"}
        </button>
        <button
          className={styles.actionBtn}
          onClick={(e) => {
            e.stopPropagation();
            setReplyOpen((v) => !v);
          }}
        >
          Reply
        </button>
      </div>

      {replyOpen && (
        <InlineComposer
          onSubmit={(body) => {
            threadStore.addComment({
              threadId: thread.id,
              comment: { body },
            });
            setReplyOpen(false);
          }}
          onCancel={() => setReplyOpen(false)}
        />
      )}
    </div>
  );
}

// ─── CommentRow ───────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  currentUserId,
  onDelete,
}: {
  comment: CommentData;
  currentUserId: string;
  onDelete: () => void;
}) {
  const ts = comment.createdAt instanceof Date
    ? comment.createdAt.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date(comment.createdAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  return (
    <div className={styles.comment}>
      <div className={styles.commentHeader}>
        <span className={styles.commentAuthor}>{comment.userId}</span>
        <span className={styles.commentTime}>{ts}</span>
        {comment.userId === currentUserId && (
          <button
            className={styles.deleteBtn}
            title="Delete comment"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            ×
          </button>
        )}
      </div>
      <p className={styles.commentBody}>
        {typeof comment.body === "string"
          ? comment.body
          : JSON.stringify(comment.body)}
      </p>
    </div>
  );
}

// ─── ComposerCard (pending new thread) ───────────────────────────────────────

function ComposerCard({
  editor,
  onSubmit,
  onCancel,
}: {
  editor: Editor;
  onSubmit: (body: string) => void;
  onCancel: () => void;
}) {
  const selectionEmpty = editor.state.selection.empty;

  return (
    <div className={styles.composer}>
      {selectionEmpty ? (
        <p className={styles.composerHint}>
          Select text in the editor first, then submit your comment.
        </p>
      ) : (
        <p className={styles.composerHint}>Adding comment to selected text…</p>
      )}
      <InlineComposer onSubmit={onSubmit} onCancel={onCancel} autoFocus />
    </div>
  );
}

// ─── InlineComposer ───────────────────────────────────────────────────────────

function InlineComposer({
  onSubmit,
  onCancel,
  autoFocus,
}: {
  onSubmit: (body: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText("");
  };

  return (
    <form className={styles.composerForm} onSubmit={handleSubmit}>
      <textarea
        ref={ref}
        className={styles.composerInput}
        placeholder="Add a comment…"
        value={text}
        rows={3}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit(e as any);
          }
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className={styles.composerButtons}>
        <button type="submit" className={styles.submitBtn} disabled={!text.trim()}>
          Comment
        </button>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
