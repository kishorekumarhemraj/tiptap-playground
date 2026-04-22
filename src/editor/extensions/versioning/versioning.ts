import { Extension } from "@tiptap/core";
import type { JSONContent } from "@tiptap/react";
import {
  type VersionAuthor,
  type VersionSnapshot,
  type VersionStore,
  memoryVersionStore,
} from "./types";

export interface VersioningOptions {
  store: VersionStore;
  author: VersionAuthor;
  /** Called every time the snapshot list changes - host UI subscribes via this. */
  onChange?: (snapshots: VersionSnapshot[]) => void;
}

export interface VersioningStorage {
  store: VersionStore;
  /** Subscribe to snapshot list updates. Returns an unsubscribe fn. */
  subscribe: (listener: (snapshots: VersionSnapshot[]) => void) => () => void;
  list: () => VersionSnapshot[];
}

declare module "@tiptap/core" {
  interface Storage {
    versioning: VersioningStorage;
  }
  interface Commands<ReturnType> {
    versioning: {
      saveVersion: (label?: string) => ReturnType;
      restoreVersion: (id: string) => ReturnType;
      deleteVersion: (id: string) => ReturnType;
    };
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `v_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export const Versioning = Extension.create<VersioningOptions, VersioningStorage>({
  name: "versioning",

  addOptions() {
    return {
      store: memoryVersionStore(),
      author: { id: "anonymous", name: "Anonymous" },
    };
  },

  addStorage() {
    const listeners = new Set<(snapshots: VersionSnapshot[]) => void>();
    const store = this.options.store;
    return {
      store,
      subscribe(listener) {
        listeners.add(listener);
        // Replay current state so subscribers don't have to call list() too.
        listener(store.list());
        return () => listeners.delete(listener);
      },
      list: () => store.list(),
      // Internal: notify subscribers. Stashed on storage so commands can
      // reach it; not part of the public type intentionally.
      _notify: () => {
        const snapshots = store.list();
        for (const l of listeners) l(snapshots);
        this.options.onChange?.(snapshots);
      },
    } as VersioningStorage & { _notify: () => void };
  },

  addCommands() {
    return {
      saveVersion:
        (label) =>
        ({ editor }) => {
          const snapshot: VersionSnapshot = {
            id: makeId(),
            label: label?.trim() || `Snapshot ${new Date().toLocaleString()}`,
            at: Date.now(),
            by: this.options.author,
            json: editor.getJSON() as JSONContent,
          };
          this.options.store.put(snapshot);
          (
            editor.storage.versioning as VersioningStorage & {
              _notify: () => void;
            }
          )._notify();
          return true;
        },

      restoreVersion:
        (id) =>
        ({ editor, commands }) => {
          const snapshot = this.options.store
            .list()
            .find((s) => s.id === id);
          if (!snapshot) return false;
          return commands.setContent(snapshot.json, { emitUpdate: true });
        },

      deleteVersion:
        (id) =>
        ({ editor }) => {
          this.options.store.remove(id);
          (
            editor.storage.versioning as VersioningStorage & {
              _notify: () => void;
            }
          )._notify();
          return true;
        },
    };
  },
});
