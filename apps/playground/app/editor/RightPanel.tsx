"use client";

import { useState } from "react";
import type { VersionSnapshot } from "@tiptap-playground/editor";
import {
  VersionsPanel,
  type DiffPaneVersion,
  type VersionsPanelHandle,
} from "@tiptap-playground/editor/react";
import styles from "./RightPanel.module.css";

/* ── Mock comments data (placeholder until Comments extension lands) ── */
interface Reply {
  id: string;
  author: string;
  color: string;
  initials: string;
  text: string;
  timestamp: number;
}

interface Comment {
  id: string;
  author: string;
  color: string;
  initials: string;
  text: string;
  timestamp: number;
  resolved: boolean;
  replies: Reply[];
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: "c1",
    author: "Alex K.",
    color: "#7c3aed",
    initials: "AK",
    text: "Should we add a section for risk mitigation steps?",
    timestamp: new Date("2026-04-28T14:30:00").getTime(),
    resolved: false,
    replies: [
      {
        id: "r1",
        author: "Priya M.",
        color: "#2563eb",
        initials: "PM",
        text: "Good idea — I'll add that to the Action Items section.",
        timestamp: new Date("2026-04-28T15:10:00").getTime(),
      },
    ],
  },
  {
    id: "c2",
    author: "Sam T.",
    color: "#0d9488",
    initials: "ST",
    text: "Risk score format — should this be numeric or qualitative?",
    timestamp: new Date("2026-04-27T09:00:00").getTime(),
    resolved: true,
    replies: [],
  },
];

/* ── Props ── */
interface RightPanelProps {
  editor: VersionsPanelHandle | null;
  diffSelection: { left: string | null; right: string | null };
  onChangeDiffSelection: (s: {
    left: string | null;
    right: string | null;
  }) => void;
  onCompare: (left: VersionSnapshot, right: VersionSnapshot) => void;
  onPreviewRestore?: (snapshot: VersionSnapshot) => void;
}

export function RightPanel({
  editor,
  diffSelection,
  onChangeDiffSelection,
  onCompare,
  onPreviewRestore,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<"versions" | "comments">(
    "versions",
  );
  const unresolvedCount = MOCK_COMMENTS.filter((c) => !c.resolved).length;

  return (
    <aside className={styles.panel}>
      {/* Tab bar */}
      <div className={styles.tabs}>
        {(["versions", "comments"] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              className={`${styles.tab} ${active ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "versions" ? <ClockIcon /> : <CommentIcon />}
              {tab === "versions" ? "Versions" : "Comments"}
              {tab === "comments" && unresolvedCount > 0 && (
                <span className={styles.badge}>{unresolvedCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Versions tab */}
      <div
        style={{
          display: activeTab === "versions" ? "flex" : "none",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <div className={styles.versionsActions}>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={!editor}
            onClick={() => {
              const label = `Version ${new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}`;
              editor?.saveVersion(label);
            }}
          >
            <SaveIcon />
            Save version
          </button>
        </div>
        <VersionsPanel
          editor={editor}
          diffSelection={diffSelection}
          onChangeDiffSelection={onChangeDiffSelection}
          onCompare={onCompare}
          onPreviewRestore={onPreviewRestore}
          embedded
        />
      </div>

      {/* Comments tab */}
      {activeTab === "comments" && (
        <div className={styles.commentsContent}>
          <button type="button" className={styles.addCommentBtn}>
            <CommentIcon />
            Add comment
          </button>

          <div className={styles.commentFilter}>
            <button
              className={`${styles.filterBtn} ${styles.filterBtnActive}`}
            >
              Open
            </button>
            <button className={styles.filterBtn}>Resolved</button>
            <button className={styles.filterBtn}>All</button>
          </div>

          <div className={styles.commentList}>
            {MOCK_COMMENTS.filter((c) => !c.resolved).map((c) => (
              <CommentItem key={c.id} comment={c} />
            ))}
            {MOCK_COMMENTS.filter((c) => c.resolved).length > 0 && (
              <>
                <div className={styles.commentGroupLabel}>Resolved</div>
                {MOCK_COMMENTS.filter((c) => c.resolved).map((c) => (
                  <CommentItem key={c.id} comment={c} />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

/* ── Comment item ── */
function CommentItem({ comment }: { comment: Comment }) {
  const [expanded, setExpanded] = useState(!comment.resolved);

  return (
    <div
      className={`${styles.commentItem} ${comment.resolved ? styles.commentResolved : ""}`}
    >
      <button
        type="button"
        className={styles.commentHeader}
        onClick={() => setExpanded((e) => !e)}
      >
        <div
          className={styles.commentAvatar}
          style={{ background: comment.color }}
        >
          {comment.initials}
        </div>
        <div className={styles.commentMeta}>
          <div className={styles.commentMetaRow}>
            <span className={styles.commentAuthor}>{comment.author}</span>
            <span className={styles.commentDate}>
              {new Date(comment.timestamp).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
            {comment.resolved && (
              <span className={styles.resolvedBadge}>Resolved</span>
            )}
            <div style={{ flex: 1 }} />
            <ChevronIcon expanded={expanded} />
          </div>
          <p
            className={`${styles.commentText} ${!expanded ? styles.commentTextClamp : ""}`}
          >
            {comment.text}
          </p>
        </div>
      </button>

      {expanded && (
        <div className={styles.commentBody}>
          {comment.replies.map((r) => (
            <div
              key={r.id}
              className={styles.reply}
              style={{ borderLeftColor: `${r.color}44` }}
            >
              <div
                className={styles.replyAvatar}
                style={{ background: r.color }}
              >
                {r.initials}
              </div>
              <div>
                <span className={styles.replyAuthor}>{r.author}</span>
                <p className={styles.replyText}>{r.text}</p>
              </div>
            </div>
          ))}
          <div className={styles.commentActions}>
            <button type="button" className={styles.commentActionBtn}>
              <ReplyIcon />
              Reply
            </button>
            {!comment.resolved && (
              <button
                type="button"
                className={`${styles.commentActionBtn} ${styles.resolveBtn}`}
              >
                <ResolveIcon />
                Resolve
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Inline SVG icons ── */
function ClockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 5.5V8l2 1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 3h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5l-3 2.5V4a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 3h7l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <rect
        x="6"
        y="3"
        width="4"
        height="4"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <rect
        x="5"
        y="9"
        width="6"
        height="5"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{
        transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
        transition: "transform 150ms ease",
        flexShrink: 0,
      }}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 8V5l-3 3 3 3V8h4a3 3 0 0 1 3 3v1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ResolveIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="5.5"
        stroke="var(--success, #059669)"
        strokeWidth="1.4"
      />
      <path
        d="M5.5 8l2 2 3-3"
        stroke="var(--success, #059669)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
