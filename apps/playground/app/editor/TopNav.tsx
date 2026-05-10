"use client";

import { useState, useRef, useEffect } from "react";
import type { EditorMode } from "@tiptap-playground/editor";
import styles from "./TopNav.module.css";

export interface DemoUser {
  id: string;
  name: string;
  color: string;
  initials: string;
}

interface TopNavProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  currentUser: DemoUser;
  availableUsers: DemoUser[];
  onUserChange: (user: DemoUser) => void;
}

export function TopNav({ mode, onModeChange, currentUser, availableUsers, onUserChange }: TopNavProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [userMenuOpen]);
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

      {/* User switcher */}
      <div className={styles.userSwitcher} ref={menuRef}>
        <button
          type="button"
          className={styles.userSwitcherBtn}
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          aria-expanded={userMenuOpen}
          aria-haspopup="listbox"
          aria-label="Switch user"
          title="Switch user for collaborative editing"
        >
          <div
            className={styles.userSwitcherAvatar}
            style={{ background: currentUser.color }}
          >
            {currentUser.initials}
          </div>
          <div className={styles.userSwitcherInfo}>
            <span className={styles.userSwitcherName}>{currentUser.name}</span>
            <span className={styles.userSwitcherHint}>Switch user</span>
          </div>
          <span className={styles.userSwitcherChevron} aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {userMenuOpen && (
          <div className={styles.userMenu} role="listbox" aria-label="Select user">
            <div className={styles.userMenuHeader}>Switch User</div>
            {availableUsers.map((u) => {
              const isSelected = u.id === currentUser.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`${styles.userMenuItem} ${isSelected ? styles.userMenuItemActive : ""}`}
                  onClick={() => {
                    onUserChange(u);
                    setUserMenuOpen(false);
                  }}
                >
                  <div
                    className={styles.userMenuAvatar}
                    style={{ background: u.color }}
                  >
                    {u.initials}
                  </div>
                  <span className={styles.userMenuName}>{u.name}</span>
                  {isSelected && (
                    <span className={styles.userMenuCheck} aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8.5 6.5 12 13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
            <div className={styles.userMenuFooter}>
              Open another tab to test collaboration
            </div>
          </div>
        )}
      </div>

      {/* Presence avatars */}
      <div className={styles.presence}>
        <div className={styles.avatarStack}>
          <div
            className={styles.presenceAvatar}
            style={{ background: currentUser.color }}
            title={currentUser.name}
          >
            {currentUser.initials}
          </div>
        </div>
      </div>

      {/* Settings */}
      <button
        type="button"
        className={styles.iconBtn}
        aria-label="Settings"
      >
        <SettingsIcon />
      </button>
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
