"use client";

import { useEffect, useState } from "react";
import type { EditorEventBus } from "@tiptap-playground/editor";
import styles from "./PermissionToast.module.css";

interface PermissionToastProps {
  events: EditorEventBus;
}

interface ToastMessage {
  id: number;
  reason: string;
}

const FRIENDLY_REASONS: Record<string, string> = {
  "content.edit": "This area is locked by the template. Only highlighted editable regions can be edited.",
  "structure.modify": "The document structure is fixed. You cannot add or remove blocks here.",
  "structure.remove-frame": "Sections and editable regions cannot be removed in document mode.",
  "field.fill": "You don't have permission to fill this field.",
};

let nextId = 1;

function LockIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="4" y="8" width="8" height="6" rx="1" stroke="white" strokeWidth="1.4" />
      <path
        d="M5.5 8V6a2.5 2.5 0 0 1 5 0v2"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PermissionToast({ events }: PermissionToastProps) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsub = events.on("permission.denied", ({ action, reason }) => {
      const friendly =
        FRIENDLY_REASONS[action] ??
        reason ??
        "This action is not allowed here.";

      const id = nextId++;
      setMessages((prev) => [...prev.slice(-2), { id, reason: friendly }]);

      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }, 3500);
    });
    return unsub;
  }, [events]);

  if (messages.length === 0) return null;

  return (
    <div className={styles.container} role="status" aria-live="polite">
      {messages.map((m) => (
        <div key={m.id} className={styles.toast}>
          <LockIcon />
          {m.reason}
        </div>
      ))}
    </div>
  );
}
