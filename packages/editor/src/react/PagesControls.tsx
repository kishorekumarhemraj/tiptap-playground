"use client";

import { useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import type { PageFormat } from "../extensions/pages";
import styles from "./PagesControls.module.css";

const PAGE_FORMATS: PageFormat[] = ["A4", "Letter", "A3", "A5", "Legal"];
const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface Props {
  editor: Editor | null;
}

export function PagesControls({ editor }: Props) {
  const pagesStorage = editor?.storage.pages as
    | { pageFormat: PageFormat; zoom: number }
    | undefined;

  const [pageFormat, setPageFormat] = useState<PageFormat>(
    pagesStorage?.pageFormat ?? "A4",
  );
  const [zoom, setZoom] = useState(pagesStorage?.zoom ?? 1);

  const handleSetPageFormat = useCallback(
    (fmt: PageFormat) => {
      setPageFormat(fmt);
      editor?.commands.setPageFormat(fmt);
    },
    [editor],
  );

  const handleSetZoom = useCallback(
    (z: number) => {
      const clamped = Math.max(0.25, Math.min(4, Math.round(z * 100) / 100));
      setZoom(clamped);
      editor?.commands.setZoom(clamped);
    },
    [editor],
  );

  const handlePageBreak = useCallback(() => {
    editor?.chain().focus().setPageBreak().run();
  }, [editor]);

  return (
    <div className={styles.pagesControls}>
      <label className={styles.controlLabel}>
        <span className={styles.controlText}>Format</span>
        <select
          className={styles.select}
          value={pageFormat}
          onChange={(e) => handleSetPageFormat(e.target.value as PageFormat)}
        >
          {PAGE_FORMATS.map((fmt) => (
            <option key={fmt} value={fmt}>
              {fmt}
            </option>
          ))}
        </select>
      </label>

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

      <button
        type="button"
        className={styles.pageBreakButton}
        onClick={handlePageBreak}
        title="Insert a manual page break at cursor position"
      >
        ⤓ Page Break
      </button>
    </div>
  );
}
