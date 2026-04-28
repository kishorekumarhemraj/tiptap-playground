"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
// @ts-expect-error — installed from TipTap Pro registry; run `pnpm install` with TIPTAP_PRO_TOKEN set
import { PageKit } from "@tiptap-pro/extension-pages-pagekit";
import { useState, useRef, useCallback } from "react";
import type { JSONContent } from "@tiptap/core";
import styles from "./PagesShell.module.css";

const PAGE_FORMATS = ["A4", "Letter", "A3", "A5", "Legal"] as const;
type PageFormatName = (typeof PAGE_FORMATS)[number];

const CONTENT_KEY = "tiptap-pages-demo:v1";

const DEFAULT_CONTENT = `<h1>Quarterly Report</h1>
<p>This document is rendered with the TipTap Pages extension — content flows naturally across A4 pages with proper margins, headers, and footers.</p>
<h2>Executive Summary</h2>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
<p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.</p>
<h2>Key Findings</h2>
<ul>
  <li>Revenue grew 18% year-over-year</li>
  <li>Customer retention rate reached 94%</li>
  <li>Launched three new product lines</li>
  <li>Expanded into two new markets</li>
</ul>
<h2>Detailed Analysis</h2>
<p>Sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>
<p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
<p>Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt.</p>
<h2>Recommendations</h2>
<p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi.</p>
<p>Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est.</p>`;

function loadContent(): JSONContent | string {
  if (typeof window === "undefined") return DEFAULT_CONTENT;
  try {
    const raw = localStorage.getItem(CONTENT_KEY);
    if (raw) return JSON.parse(raw) as JSONContent;
  } catch {}
  return DEFAULT_CONTENT;
}

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function PagesShell() {
  const [pageFormat, setPageFormatState] = useState<PageFormatName>("A4");
  const [zoom, setZoomState] = useState(1);
  const [pageBreakLabel] = useState("Page break");

  const initialContentRef = useRef(loadContent());

  const editor = useEditor({
    extensions: [
      StarterKit,
      PageKit.configure({
        pages: {
          pageFormat: "A4",
          headerHeight: 60,
          footerHeight: 60,
          pageGap: 40,
          header: "",
          footer: "Page {page} of {total}",
          pageGapBackground: "#f1f1ef",
          zoom: 1,
        },
        table: {
          resizable: true,
        },
        pagebreak: {
          label: pageBreakLabel,
        },
      }),
    ],
    content: initialContentRef.current,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      try {
        localStorage.setItem(CONTENT_KEY, JSON.stringify(e.getJSON()));
      } catch {}
    },
  });

  const handleSetPageFormat = useCallback(
    (fmt: PageFormatName) => {
      setPageFormatState(fmt);
      editor?.commands.setPageFormat(fmt);
    },
    [editor],
  );

  const handleSetZoom = useCallback(
    (z: number) => {
      const clamped = Math.max(0.25, Math.min(4, Math.round(z * 100) / 100));
      setZoomState(clamped);
      editor?.commands.setZoom(clamped);
    },
    [editor],
  );

  const handlePageBreak = useCallback(() => {
    editor?.chain().focus().setPageBreak().run();
  }, [editor]);

  const handleClearStorage = useCallback(() => {
    try {
      localStorage.removeItem(CONTENT_KEY);
    } catch {}
    editor?.commands.setContent(DEFAULT_CONTENT);
  }, [editor]);

  return (
    <div className={styles.shell}>
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          {/* Page format */}
          <label className={styles.controlLabel}>
            <span className={styles.controlText}>Format</span>
            <select
              className={styles.select}
              value={pageFormat}
              onChange={(e) =>
                handleSetPageFormat(e.target.value as PageFormatName)
              }
            >
              {PAGE_FORMATS.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </select>
          </label>

          {/* Zoom */}
          <div className={styles.zoomGroup}>
            <span className={styles.controlText}>Zoom</span>
            <button
              type="button"
              className={styles.zoomStep}
              onClick={() => handleSetZoom(zoom - 0.25)}
              disabled={zoom <= 0.25}
              aria-label="Zoom out"
            >
              −
            </button>
            <select
              className={styles.zoomSelect}
              value={ZOOM_PRESETS.includes(zoom) ? zoom : "custom"}
              onChange={(e) => handleSetZoom(Number(e.target.value))}
            >
              {ZOOM_PRESETS.map((z) => (
                <option key={z} value={z}>
                  {Math.round(z * 100)}%
                </option>
              ))}
              {!ZOOM_PRESETS.includes(zoom) && (
                <option value="custom" disabled>
                  {Math.round(zoom * 100)}%
                </option>
              )}
            </select>
            <button
              type="button"
              className={styles.zoomStep}
              onClick={() => handleSetZoom(zoom + 0.25)}
              disabled={zoom >= 4}
              aria-label="Zoom in"
            >
              +
            </button>
          </div>

          {/* Page break */}
          <button
            type="button"
            className={styles.controlButton}
            onClick={handlePageBreak}
            title="Insert a manual page break at cursor position"
          >
            ⤓ Page Break
          </button>
        </div>

        <div className={styles.controlsRight}>
          <button
            type="button"
            className={styles.ghostButton}
            onClick={handleClearStorage}
            title="Reset to default content"
          >
            Reset
          </button>
        </div>
      </div>

      <EditorContent editor={editor} className={styles.editorContent} />
    </div>
  );
}
