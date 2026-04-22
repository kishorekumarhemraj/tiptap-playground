import type { JSONContent } from "@tiptap/react";

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
}

export interface VersionStore {
  list: () => VersionSnapshot[];
  put: (snapshot: VersionSnapshot) => void;
  remove: (id: string) => void;
  clear: () => void;
}

/** Default in-memory store, swapped for `localStorageVersionStore` in the browser. */
export function memoryVersionStore(): VersionStore {
  let snapshots: VersionSnapshot[] = [];
  return {
    list: () => [...snapshots],
    put: (s) => {
      snapshots = [...snapshots, s].sort((a, b) => b.at - a.at);
    },
    remove: (id) => {
      snapshots = snapshots.filter((s) => s.id !== id);
    },
    clear: () => {
      snapshots = [];
    },
  };
}

export function localStorageVersionStore(documentId: string): VersionStore {
  const key = `tiptap-versions:${documentId}`;

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

  function write(snapshots: VersionSnapshot[]) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(snapshots));
    } catch {
      /* quota or private mode - non-fatal */
    }
  }

  return {
    list: () => read().sort((a, b) => b.at - a.at),
    put: (s) => {
      const next = [...read().filter((x) => x.id !== s.id), s].sort(
        (a, b) => b.at - a.at,
      );
      write(next);
    },
    remove: (id) => {
      write(read().filter((s) => s.id !== id));
    },
    clear: () => write([]),
  };
}
