"use client";

import { useState, useCallback, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { IconZoomIn, IconZoomOut } from "./icons";
import styles from "./EditorStatusBar.module.css";

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface Props {
  editor: Editor | null;
}

export function EditorStatusBar({ editor }: Props) {
  const pagesStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)
    ?.pages as { zoom: number } | undefined;

  const [zoom, setZoom] = useState(pagesStorage?.zoom ?? 1);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      const s = (editor.storage as unknown as Record<string, unknown>)?.pages as { zoom: number } | undefined;
      if (s?.zoom !== undefined) setZoom(s.zoom);
    };
    editor.on("transaction", onUpdate);
    return () => { editor.off("transaction", onUpdate); };
  }, [editor]);

  const handleSetZoom = useCallback(
    (z: number) => {
      const clamped = Math.max(0.25, Math.min(4, Math.round(z * 100) / 100));
      setZoom(clamped);
      editor?.commands.setZoom(clamped);
    },
    [editor],
  );

  return (
    <div className={styles.statusBar}>
      <div className={styles.left}>
        <span className={styles.formatBadge}>A4</span>
      </div>
      <div className={styles.right}>
        <button
          type="button"
          className={styles.zoomBtn}
          onClick={() => handleSetZoom(zoom - 0.25)}
          disabled={zoom <= 0.25}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <IconZoomOut />
        </button>
        <select
          className={styles.zoomSelect}
          value={ZOOM_PRESETS.includes(zoom) ? zoom : "custom"}
          onChange={(e) => handleSetZoom(Number(e.target.value))}
          aria-label="Zoom level"
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
          className={styles.zoomBtn}
          onClick={() => handleSetZoom(zoom + 0.25)}
          disabled={zoom >= 4}
          aria-label="Zoom in"
          title="Zoom in"
        >
          <IconZoomIn />
        </button>
      </div>
    </div>
  );
}
