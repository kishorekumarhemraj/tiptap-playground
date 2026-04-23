import type { JSONContent } from "@tiptap/react";
import type { EditorUser } from "../core/policy";

export interface VersionAuthor {
  id: string;
  name: string;
}

export interface VersionSnapshot {
  id: string;
  label: string;
  at: number;
  by: VersionAuthor;
  json: JSONContent;
  /**
   * Arbitrary host-managed metadata - signing party, workflow state,
   * upstream revision id, etc. Kept free-form so integrations don't
   * have to patch the library type every time they add a field.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Pluggable persistence for version snapshots. The library ships
 * in-memory and localStorage drivers; hosts typically replace this
 * with an HTTP-backed driver that writes to their DMS.
 */
export interface VersionStore {
  list(): Promise<VersionSnapshot[]> | VersionSnapshot[];
  get(id: string): Promise<VersionSnapshot | null> | VersionSnapshot | null;
  put(snapshot: VersionSnapshot): Promise<void> | void;
  remove(id: string): Promise<void> | void;
  clear?(): Promise<void> | void;
  /**
   * Optional subscription for host-driven refresh (e.g. HTTP driver
   * reacting to a WebSocket event). In-memory drivers can omit this.
   */
  subscribe?(
    listener: (snapshots: VersionSnapshot[]) => void,
  ): () => void;
}

export function memoryVersionStore(): VersionStore {
  let snapshots: VersionSnapshot[] = [];
  const listeners = new Set<(s: VersionSnapshot[]) => void>();
  const notify = () => {
    const view = [...snapshots];
    for (const l of listeners) l(view);
  };
  return {
    list: () => [...snapshots].sort((a, b) => b.at - a.at),
    get: (id) => snapshots.find((s) => s.id === id) ?? null,
    put: (s) => {
      snapshots = [...snapshots.filter((x) => x.id !== s.id), s].sort(
        (a, b) => b.at - a.at,
      );
      notify();
    },
    remove: (id) => {
      snapshots = snapshots.filter((s) => s.id !== id);
      notify();
    },
    clear: () => {
      snapshots = [];
      notify();
    },
    subscribe: (l) => {
      listeners.add(l);
      l([...snapshots]);
      return () => listeners.delete(l);
    },
  };
}

export function localStorageVersionStore(documentId: string): VersionStore {
  const key = `tiptap-editor:versions:${documentId}`;
  const listeners = new Set<(s: VersionSnapshot[]) => void>();

  function read(): VersionSnapshot[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as VersionSnapshot[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function write(next: VersionSnapshot[]) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* quota or private mode - non-fatal */
    }
    const view = [...next];
    for (const l of listeners) l(view);
  }

  return {
    list: () => read().sort((a, b) => b.at - a.at),
    get: (id) => read().find((s) => s.id === id) ?? null,
    put: (s) => {
      const next = [...read().filter((x) => x.id !== s.id), s].sort(
        (a, b) => b.at - a.at,
      );
      write(next);
    },
    remove: (id) => write(read().filter((s) => s.id !== id)),
    clear: () => write([]),
    subscribe: (l) => {
      listeners.add(l);
      l(read());
      return () => listeners.delete(l);
    },
  };
}

export function asVersionAuthor(user: EditorUser): VersionAuthor {
  return { id: user.id, name: user.name };
}
