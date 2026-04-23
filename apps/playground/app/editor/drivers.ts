"use client";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
import {
  consoleAuditLog,
  localStorageVersionStore,
  type CollaborationProviderFactory,
  type EditorDrivers,
} from "@tiptap-playground/editor";

/**
 * Returns a driver bundle suitable for the playground: localStorage
 * versions, console-logged audit, and (when `NEXT_PUBLIC_COLLAB_URL`
 * is set) a y-websocket-backed collaboration provider.
 *
 * In a real app this file is where you'd wire your HTTP versioning
 * API, SIEM-backed audit sink, HSM-backed signature ceremony, and
 * so on.
 */
export function buildPlaygroundDrivers(documentId: string): EditorDrivers {
  const collaboration = buildCollabFactory();
  return {
    versionStore: localStorageVersionStore(documentId),
    auditLog: consoleAuditLog(),
    collaboration: collaboration ?? undefined,
  };
}

function buildCollabFactory(): CollaborationProviderFactory | null {
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_COLLAB_URL;
  if (!url) return null;
  const room = process.env.NEXT_PUBLIC_COLLAB_ROOM ?? "tiptap-playground";

  return ({ documentId }) => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(url, room, ydoc);
    new IndexeddbPersistence(`tiptap:${documentId}`, ydoc);
    return {
      ydoc,
      awarenessProvider: provider,
      destroy: () => {
        provider.destroy();
        ydoc.destroy();
      },
      name: `yjs:${room}`,
    };
  };
}
