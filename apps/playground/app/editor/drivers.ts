"use client";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
import {
  consoleAuditLog,
  localStorageVersionStore,
  memoryFieldRegistry,
  type CollaborationProviderFactory,
  type EditorDrivers,
  type FieldDefinition,
} from "@tiptap-playground/editor";

const DEMO_FIELDS: FieldDefinition[] = [
  {
    id: "decision",
    kind: "select",
    label: "Decision",
    instruction: "Final decision recorded by the reviewer",
    required: true,
    options: [
      { value: "approved", label: "Approved" },
      { value: "rejected", label: "Rejected" },
      { value: "revise", label: "Needs revision" },
    ],
  },
  {
    id: "review-date",
    kind: "date",
    label: "Review date",
    required: false,
  },
];

/**
 * Returns a driver bundle suitable for the playground: localStorage
 * versions, console-logged audit, an in-memory field registry seeded
 * with demo definitions, and (when `NEXT_PUBLIC_COLLAB_URL` is set) a
 * y-websocket-backed collaboration provider.
 *
 * In a real app this file is where you'd wire your HTTP versioning
 * API, SIEM-backed audit sink, HSM-backed signature ceremony, and
 * the live FieldRegistry that pulls field defs + LOVs from your
 * application backend.
 */
export function buildPlaygroundDrivers(documentId: string): EditorDrivers {
  const collaboration = buildCollabFactory();
  return {
    versionStore: localStorageVersionStore(documentId),
    auditLog: consoleAuditLog(),
    collaboration: collaboration ?? undefined,
    // `render` is wired later (phase 3) when the FieldView NodeView
    // lands. Phase 1 only proves the schema and driver wire up.
    fields: memoryFieldRegistry(DEMO_FIELDS),
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
