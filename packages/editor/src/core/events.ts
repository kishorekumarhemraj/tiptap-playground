import type { JSONContent } from "@tiptap/react";
import type { VersionSnapshot } from "../drivers/version-store";
import type { Signature } from "../drivers/signature-ceremony";

/**
 * Typed event bus. Every domain event the editor raises funnels
 * through here so host apps can drive workflows (approvals,
 * notifications, audit sinks) without patching the extensions.
 */
export interface EditorEventMap {
  "editor.ready": { documentId: string };
  "editor.destroy": { documentId: string };

  "version.saved": { snapshot: VersionSnapshot; signature?: Signature };
  "version.restored": { snapshot: VersionSnapshot };
  "version.deleted": { id: string };

  "change.tracking.toggled": { active: boolean };
  "change.accepted": { count: number; changeId?: string };
  "change.rejected": { count: number; changeId?: string };

  /** A `field` value was committed via the host's renderer. */
  "field.value.changed": {
    id: string | null;
    fieldId: string;
    from: unknown;
    to: unknown;
  };

  "document.changed": { json: JSONContent };

  "permission.denied": {
    action: string;
    reason?: string;
  };
}

export type EditorEventName = keyof EditorEventMap;
export type EditorEventListener<E extends EditorEventName> = (
  payload: EditorEventMap[E],
) => void;
export type Unsubscribe = () => void;

export interface EditorEventBus {
  on<E extends EditorEventName>(
    event: E,
    listener: EditorEventListener<E>,
  ): Unsubscribe;
  off<E extends EditorEventName>(
    event: E,
    listener: EditorEventListener<E>,
  ): void;
  emit<E extends EditorEventName>(event: E, payload: EditorEventMap[E]): void;
}

/**
 * Lightweight in-memory bus. Hosts can swap this for a bus that
 * forwards to an external telemetry pipeline (Kafka, PostHog, etc.)
 * by implementing `EditorEventBus` themselves.
 */
export function createEventBus(): EditorEventBus {
  const listeners = new Map<EditorEventName, Set<(p: unknown) => void>>();

  return {
    on(event, listener) {
      const set =
        listeners.get(event) ?? new Set<(p: unknown) => void>();
      set.add(listener as (p: unknown) => void);
      listeners.set(event, set);
      return () => {
        set.delete(listener as (p: unknown) => void);
      };
    },
    off(event, listener) {
      listeners.get(event)?.delete(listener as (p: unknown) => void);
    },
    emit(event, payload) {
      const set = listeners.get(event);
      if (!set) return;
      for (const l of set) {
        try {
          l(payload);
        } catch (err) {
          console.error(`[editor] listener for ${event} threw`, err);
        }
      }
    },
  };
}
