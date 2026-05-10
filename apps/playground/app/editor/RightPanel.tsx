"use client";

import React, { useState, useCallback, useRef } from "react";
import type { JSONContent } from "@tiptap/core";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type { VersionSnapshot, ThreadStore } from "@tiptap-playground/editor";
import {
  VersionsPanel,
  CommentsPanel,
  type DiffPaneVersion,
  type VersionsPanelHandle,
} from "@tiptap-playground/editor/react";
import styles from "./RightPanel.module.css";

/* ── Props ── */
interface RightPanelProps {
  editor: VersionsPanelHandle | null;
  tiptapEditor: TiptapEditor | null;
  threadStore: ThreadStore | null;
  userId: string;
  docJson?: JSONContent | null;
  diffSelection: { left: string | null; right: string | null };
  onChangeDiffSelection: (s: {
    left: string | null;
    right: string | null;
  }) => void;
  onCompare: (left: VersionSnapshot, right: VersionSnapshot) => void;
  onPreviewRestore?: (snapshot: VersionSnapshot) => void;
  onResize?: (width: number) => void;
}

export function RightPanel({
  editor,
  tiptapEditor,
  threadStore,
  userId,
  docJson,
  diffSelection,
  onChangeDiffSelection,
  onCompare,
  onPreviewRestore,
  onResize,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<"versions" | "comments" | "json">(
    "versions",
  );

  // Count open threads from live thread store
  const [openCount, setOpenCount] = useState(0);
  React.useEffect(() => {
    if (!threadStore) return;
    return threadStore.subscribe((threads) => {
      const n = Array.from(threads.values()).filter(
        (t) => !t.resolved && !t.deletedAt,
      ).length;
      setOpenCount(n);
    });
  }, [threadStore]);

  // Auto-switch to Comments tab when a pending comment is started
  React.useEffect(() => {
    if (!tiptapEditor) return;
    const check = () => {
      const s = (tiptapEditor.storage as Record<string, any>).comments;
      if (s?.pendingComment) setActiveTab("comments");
    };
    tiptapEditor.on("transaction", check);
    return () => { tiptapEditor.off("transaction", check); };
  }, [tiptapEditor]);

  // Resize handle
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(300);
  const panelRef = useRef<HTMLElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = panelRef.current?.offsetWidth ?? 300;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX.current - ev.clientX;
      const next = Math.max(220, Math.min(600, startWidth.current + delta));
      onResize?.(next);
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [onResize]);

  return (
    <aside className={styles.panel} ref={panelRef}>
      <div className={styles.resizeHandle} onMouseDown={onMouseDown} />
      {/* Tab bar */}
      <div className={styles.tabs}>
        {(["versions", "comments", "json"] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              className={`${styles.tab} ${active ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "versions" && <ClockIcon />}
              {tab === "comments" && <CommentIcon />}
              {tab === "json" && <BracesIcon />}
              {tab === "versions" ? "Versions" : tab === "comments" ? "Comments" : "JSON"}
              {tab === "comments" && openCount > 0 && (
                <span className={styles.badge}>{openCount}</span>
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

      {/* JSON tab */}
      {activeTab === "json" && (
        <div className={styles.jsonContent}>
          <div className={styles.jsonHeader}>
            <span className={styles.jsonLabel}>Document JSON</span>
            <button
              type="button"
              className={styles.jsonCopyBtn}
              onClick={() => {
                if (docJson) {
                  navigator.clipboard.writeText(JSON.stringify(docJson, null, 2));
                }
              }}
              disabled={!docJson}
              title="Copy to clipboard"
            >
              <CopyIcon />
              Copy
            </button>
          </div>
          <pre className={styles.jsonPre}>
            {docJson
              ? colorizeJson(JSON.stringify(docJson, null, 2))
              : <span className={styles.jsonEmpty}>Loading…</span>
            }
          </pre>
        </div>
      )}

      {/* Comments tab */}
      {activeTab === "comments" && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {threadStore ? (
            <CommentsPanel
              editor={tiptapEditor}
              threadStore={threadStore}
              userId={userId}
            />
          ) : (
            <p style={{ padding: 16, fontSize: 13, color: "#6b7280" }}>
              Comments require a thread store. Add one to your driver bundle.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

/* ── JSON syntax colorizer ── */
function colorizeJson(json: string): React.ReactNode {
  const tokens = json.split(/("(?:\\.|[^"\\])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/);
  return tokens.map((token, i) => {
    if (/^".*":$/.test(token.trim())) {
      return <span key={i} className={styles.jsonKey}>{token}</span>;
    }
    if (/^"/.test(token)) {
      return <span key={i} className={styles.jsonString}>{token}</span>;
    }
    if (/^(true|false)$/.test(token)) {
      return <span key={i} className={styles.jsonBool}>{token}</span>;
    }
    if (token === "null") {
      return <span key={i} className={styles.jsonNull}>{token}</span>;
    }
    if (/^-?\d/.test(token)) {
      return <span key={i} className={styles.jsonNumber}>{token}</span>;
    }
    return token;
  });
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

function BracesIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 2.5C3.5 2.5 3 3 3 4.5v2C3 7.5 2 8 2 8s1 .5 1 1.5v2C3 13 3.5 13.5 5 13.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 2.5c1.5 0 2 .5 2 2v2C13 7.5 14 8 14 8s-1 .5-1 1.5v2c0 1.5-.5 2-2 2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="5"
        width="8"
        height="9"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M3 11V3a1 1 0 0 1 1-1h8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
