"use client";

import type { FieldRenderProps } from "@tiptap-playground/editor";
import styles from "./FieldRenderer.module.css";

/**
 * Host-supplied React renderer wired into the playground's
 * `FieldRegistry`. The library calls this for every `field` node;
 * we pivot on `def.kind` to render the appropriate control.
 *
 * In a real app this renderer would live alongside the rest of the
 * application's form components and would likely use a UI kit
 * (MUI, Mantine, shadcn). The shape is unchanged — it's still
 * `(def, value, readOnly, onChange) => ReactNode`.
 */
export function renderField(props: FieldRenderProps) {
  const { def, value, readOnly, onChange } = props;

  switch (def.kind) {
    case "select":
      return (
        <label className={styles.control}>
          <span className={styles.label}>{def.label}</span>
          <select
            className={styles.select}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={readOnly}
          >
            <option value="">— select —</option>
            {(def.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {def.required && <span className={styles.required}>*</span>}
        </label>
      );

    case "date":
      return (
        <label className={styles.control}>
          <span className={styles.label}>{def.label}</span>
          <input
            className={styles.input}
            type="date"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={readOnly}
          />
          {def.required && <span className={styles.required}>*</span>}
        </label>
      );

    case "number":
      return (
        <label className={styles.control}>
          <span className={styles.label}>{def.label}</span>
          <input
            className={styles.input}
            type="number"
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return onChange(null);
              const parsed = Number(raw);
              onChange(Number.isFinite(parsed) ? parsed : null);
            }}
            disabled={readOnly}
          />
          {def.required && <span className={styles.required}>*</span>}
        </label>
      );

    case "boolean":
      return (
        <label className={styles.control}>
          <input
            className={styles.checkbox}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            disabled={readOnly}
          />
          <span className={styles.label}>{def.label}</span>
        </label>
      );

    case "text":
    default:
      return (
        <label className={styles.control}>
          <span className={styles.label}>{def.label}</span>
          <input
            className={styles.input}
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            placeholder={def.instruction}
          />
          {def.required && <span className={styles.required}>*</span>}
        </label>
      );
  }
}
