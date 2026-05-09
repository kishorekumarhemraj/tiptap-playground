"use client";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import {
  consoleAuditLog,
  localStorageVersionStore,
  memoryFieldRegistry,
  InMemoryThreadStore,
  type CollaborationProvider,
  type CollaborationProviderFactory,
  type EditorDrivers,
  type FieldDefinition,
} from "@tiptap-playground/editor";
import { renderField } from "./fields/FieldRenderer";

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
    id: "reviewer-name",
    kind: "text",
    label: "Reviewer",
    instruction: "Name of the reviewer",
    required: true,
  },
  {
    id: "review-date",
    kind: "date",
    label: "Review date",
    required: false,
  },
  {
    id: "risk-score",
    kind: "number",
    label: "Risk score",
    instruction: "0–100",
    required: false,
  },
  {
    id: "needs-followup",
    kind: "boolean",
    label: "Needs follow-up",
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
  // Three configurations, picked in priority order:
  //   1. NEXT_PUBLIC_COLLAB_URL    → real y-websocket transport (prod path)
  //   2. NEXT_PUBLIC_COLLAB_LOCAL  → BroadcastChannel for tab-to-tab demos
  //   3. (unset)                   → no collab, falls back to localStorage
  //
  // BroadcastChannel mode is opt-in because seeding an empty Y.Doc with
  // the default template content has timing issues in dev (React
  // StrictMode + fast refresh races with y-prosemirror's binding).
  // Explicitly enabling it is the cleanest way to demo two-tab editing.
  const collaboration =
    buildWebSocketCollabFactory() ?? buildBroadcastChannelCollabFactory();
  return {
    versionStore: localStorageVersionStore(documentId),
    auditLog: consoleAuditLog(),
    collaboration: collaboration ?? undefined,
    fields: memoryFieldRegistry(DEMO_FIELDS, renderField),
    threadStore: new InMemoryThreadStore(),
  };
}

function buildWebSocketCollabFactory(): CollaborationProviderFactory | null {
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

/**
 * Same-browser collaboration via BroadcastChannel. No server, no peer
 * negotiation — every tab on the same origin that opens the same
 * documentId joins the same Y.Doc and Awareness pool. This is enough to
 * demo remote cursors and live edits between two tabs.
 *
 * For multi-machine collab use a real provider (y-websocket, hocuspocus,
 * tiptap-cloud) — set NEXT_PUBLIC_COLLAB_URL to switch.
 */
function buildBroadcastChannelCollabFactory(): CollaborationProviderFactory | null {
  if (typeof window === "undefined") return null;
  if (typeof BroadcastChannel === "undefined") return null;
  // Opt-in via env var. Without it the playground stays single-user
  // and the editor's localStorage path drives content as before.
  if (process.env.NEXT_PUBLIC_COLLAB_LOCAL !== "true") return null;

  return ({ documentId }): CollaborationProvider => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    const channel = new BroadcastChannel(`tpe:collab:${documentId}`);
    // Persist the Y.Doc to IndexedDB so a single-tab refresh keeps its
    // edits — without this, every reload starts from an empty Y.Doc.
    const persistence = new IndexeddbPersistence(`tpe:bc:${documentId}`, ydoc);

    const STATE_REQUEST = "state-request";
    const DOC_UPDATE = "doc-update";
    const AWARENESS_UPDATE = "awareness-update";

    // Forward local doc edits to other tabs. Y.Doc emits 'update' for
    // any transaction; we tag remote-applied updates with origin
    // 'broadcastchannel' so we don't echo them back.
    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "broadcastchannel") return;
      channel.postMessage({ type: DOC_UPDATE, update });
    };
    ydoc.on("update", onDocUpdate);

    // Forward local awareness changes (caret + user info) to other tabs.
    const onAwarenessUpdate = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      if (origin === "broadcastchannel") return;
      const changedClients = added.concat(updated).concat(removed);
      const update = encodeAwarenessUpdate(awareness, changedClients);
      channel.postMessage({ type: AWARENESS_UPDATE, update });
    };
    awareness.on("update", onAwarenessUpdate);

    channel.onmessage = (event) => {
      const data = event.data as
        | { type: "state-request" }
        | { type: "doc-update"; update: Uint8Array }
        | { type: "awareness-update"; update: Uint8Array };
      if (!data || typeof data !== "object" || !("type" in data)) return;

      if (data.type === DOC_UPDATE) {
        Y.applyUpdate(ydoc, data.update, "broadcastchannel");
        return;
      }
      if (data.type === AWARENESS_UPDATE) {
        applyAwarenessUpdate(awareness, data.update, "broadcastchannel");
        return;
      }
      if (data.type === STATE_REQUEST) {
        // A new tab is asking for current state. Send our doc snapshot
        // and the full awareness map so it can join cleanly.
        channel.postMessage({
          type: DOC_UPDATE,
          update: Y.encodeStateAsUpdate(ydoc),
        });
        const clients = Array.from(awareness.getStates().keys());
        if (clients.length > 0) {
          channel.postMessage({
            type: AWARENESS_UPDATE,
            update: encodeAwarenessUpdate(awareness, clients),
          });
        }
      }
    };

    // Announce ourselves and pull current state from any existing tabs.
    channel.postMessage({ type: STATE_REQUEST });

    // Clear our awareness slot when the tab closes so other tabs drop
    // our caret promptly (otherwise it lingers until outdatedTimeout).
    const onUnload = () => {
      removeAwarenessStates(awareness, [ydoc.clientID], "window-unload");
    };
    window.addEventListener("beforeunload", onUnload);

    return {
      ydoc,
      // CollaborationCaret reads `.awareness` off whatever object we hand
      // it. WebsocketProvider exposes it via a property; we mimic that.
      awarenessProvider: { awareness },
      destroy: () => {
        window.removeEventListener("beforeunload", onUnload);
        ydoc.off("update", onDocUpdate);
        awareness.off("update", onAwarenessUpdate);
        channel.close();
        persistence.destroy();
        awareness.destroy();
        ydoc.destroy();
      },
      name: `broadcastchannel:${documentId}`,
    };
  };
}
