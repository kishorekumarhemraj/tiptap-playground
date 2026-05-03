"use client";

import type { EditorMode } from "@tiptap-playground/editor";
import styles from "./TopNav.module.css";

const PRESENCE_USERS = [
  { id: "u1", name: "Priya M.", color: "#2563eb", initials: "PM" },
  { id: "u2", name: "Alex K.", color: "#7c3aed", initials: "AK" },
  { id: "u3", name: "Sam T.", color: "#0d9488", initials: "ST" },
];

interface TopNavProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

export function TopNav({ mode, onModeChange }: TopNavProps) {
  return (
    <header className={styles.nav}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <LayersIcon />
        </div>
        <span className={styles.logoText}>
          Block<span className={styles.logoAccent}>Ed</span>
        </span>
      </div>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <span className={styles.breadcrumbSlash}>/</span>
        <span className={styles.breadcrumbDoc}>Quarterly Compliance Review</span>
        <span className={styles.breadcrumbVersion}>v2 · Saved</span>
      </div>

      <div className={styles.spacer} />

      {/* Mode switcher */}
      <div
        className={styles.modeSwitcher}
        role="radiogroup"
        aria-label="Editor mode"
      >
        {(["template", "document"] as EditorMode[]).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              className={`${styles.modeBtn} ${active ? styles.modeBtnActive : ""}`}
              onClick={() => onModeChange(m)}
              title={
                m === "template"
                  ? "Author the template: add sections, editable regions, and form fields"
                  : "Fill in a document: structure is fixed; only editable regions accept input"
              }
            >
              {m === "template" ? <PenIcon active={active} /> : <PageIcon active={active} />}
              {m === "template" ? "Template" : "Document"}
            </button>
          );
        })}
      </div>

      {/* Presence avatars */}
      <div className={styles.presence}>
        <div className={styles.avatarStack}>
          {PRESENCE_USERS.map((u) => (
            <div
              key={u.id}
              className={styles.presenceAvatar}
              style={{ background: u.color }}
              title={u.name}
            >
              {u.initials}
            </div>
          ))}
        </div>
        <span className={styles.presenceLabel}>
          {PRESENCE_USERS.length} editing
        </span>
      </div>

      {/* Settings */}
      <button
        type="button"
        className={styles.iconBtn}
        aria-label="Settings"
      >
        <SettingsIcon />
      </button>

      {/* Current user */}
      <div
        className={styles.currentUser}
        style={{ background: "#2563eb" }}
        title="Priya M."
      >
        PM
      </div>
    </header>
  );
}

function LayersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <polygon
        points="8,2 14,5.5 8,9 2,5.5"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M2 9l6 3.5L14 9"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PenIcon({ active }: { active: boolean }) {
  const color = active ? "#fff" : "currentColor";
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.5 2.5l2 2L6 12H4v-2L11.5 2.5z"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PageIcon({ active }: { active: boolean }) {
  const color = active ? "#fff" : "currentColor";
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 2h6l4 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M10 2v4h4" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      <line x1="5" y1="9" x2="11" y2="9" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5" y1="12" x2="9" y2="12" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 2v1M8 13v1M2 8h1M13 8h1M3.5 3.5l.7.7M11.8 11.8l.7.7M3.5 12.5l.7-.7M11.8 4.2l.7-.7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
