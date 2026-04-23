"use client";

import type { Editor } from "@tiptap/react";
import type { ToolbarItem } from "../core/types";
import styles from "./Toolbar.module.css";

export interface ToolbarProps {
  editor: Editor | null;
  items: ToolbarItem[];
  className?: string;
}

export function Toolbar({ editor, items, className }: ToolbarProps) {
  if (!editor) {
    return (
      <div
        className={`${styles.toolbar} ${className ?? ""}`.trim()}
        aria-busy="true"
      />
    );
  }

  return (
    <div
      className={`${styles.toolbar} ${className ?? ""}`.trim()}
      role="toolbar"
    >
      {items.map((item) => {
        if (item.kind === "divider") {
          return <span key={item.id} className={styles.divider} />;
        }
        if (item.kind === "dropdown") {
          return (
            <select
              key={item.id}
              className={styles.dropdown}
              onChange={(e) => {
                const selected = item.items.find((i) => i.id === e.target.value);
                selected?.onRun(editor);
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
          );
        }

        const active = item.isActive?.(editor) ?? false;
        const disabled = item.isDisabled?.(editor) ?? false;
        return (
          <button
            key={item.id}
            type="button"
            className={`${styles.button} ${active ? styles.active : ""}`}
            title={item.title ?? item.label}
            disabled={disabled}
            onClick={() => item.onRun(editor)}
          >
            {item.icon ?? item.label}
          </button>
        );
      })}
    </div>
  );
}
