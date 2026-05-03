"use client";

import type { Editor } from "@tiptap/react";
import type { ToolbarItem } from "../core/types";
import styles from "./Toolbar.module.css";

export interface ToolbarProps {
  editor: Editor | null;
  items: ToolbarItem[];
  className?: string;
}

/**
 * Stateless toolbar renderer.
 *
 * Design principles:
 * - 28×28 px icon-only buttons; text labels only where no icon is provided.
 * - CSS-driven tooltips via `data-tooltip` — no JS, no library dependency.
 *   Tooltip appears BELOW each button (into the document area) so it is
 *   never blocked by the sticky header above.
 * - Keyboard shortcuts shown inside the tooltip (passed via `item.title`).
 * - Dividers rendered as hairline separators between logical groups.
 * - Dropdowns use a styled `<select>` with a chevron overlay.
 * - Active state: accent-blue fill; disabled state: 35% opacity.
 */
export function Toolbar({ editor, items, className }: ToolbarProps) {
  if (!editor) {
    return (
      <div
        className={`${styles.toolbar} ${className ?? ""}`.trim()}
        aria-busy="true"
        aria-label="Editor toolbar loading"
      />
    );
  }

  return (
    <div className={`${styles.toolbarOuter} ${className ?? ""}`.trim()}>
      <div
        className={styles.toolbar}
        role="toolbar"
        aria-label="Editor toolbar"
      >
      {items.map((item) => {
        if (item.kind === "divider") {
          return (
            <span
              key={item.id}
              className={styles.divider}
              role="separator"
              aria-orientation="vertical"
            />
          );
        }

        if (item.kind === "dropdown") {
          return (
            <div key={item.id} className={styles.dropdownWrapper} data-tooltip={item.label}>
              <select
                className={styles.dropdown}
                aria-label={item.label}
                onChange={(e) => {
                  const selected = item.items.find((i) => i.id === e.target.value);
                  if (selected) {
                    selected.onRun(editor);
                    // Reset to placeholder so the dropdown reflects doc state
                    (e.target as HTMLSelectElement).value = "";
                  }
                }}
                value=""
              >
                <option value="" disabled>
                  {item.label}
                </option>
                {item.items.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.label}
                  </option>
                ))}
              </select>
              <span className={styles.dropdownChevron} aria-hidden="true">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          );
        }

        // Button
        const active = item.isActive?.(editor) ?? false;
        const disabled = item.isDisabled?.(editor) ?? false;
        const tooltip = item.title ?? item.label;

        return (
          <button
            key={item.id}
            type="button"
            className={`${styles.button} ${active ? styles.active : ""}`}
            data-tooltip={tooltip}
            aria-label={tooltip}
            aria-pressed={item.isActive ? active : undefined}
            disabled={disabled}
            onClick={() => item.onRun(editor)}
          >
            {item.icon ?? <span className={styles.textLabel}>{item.label}</span>}
          </button>
        );
      })}
      </div>
    </div>
  );
}
