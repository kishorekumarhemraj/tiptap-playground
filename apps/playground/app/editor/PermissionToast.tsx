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
          <span className={styles.icon} aria-hidden="true">🔒</span>
          {m.reason}
        </div>
      ))}
    </div>
  );
}
