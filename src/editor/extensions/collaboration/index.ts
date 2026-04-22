import type { AnyExtension } from "@tiptap/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import * as Y from "yjs";
import type { EditorExtensionContext, EditorExtensionModule } from "../../types";

export interface CollaborationProviderConfig {
  url: string;
  room: string;
  token?: string;
}

export interface CollaborationFeatureConfig {
  provider: CollaborationProviderConfig;
  /**
   * Local cache layer. `indexeddb` keeps the document offline; `none`
   * relies entirely on the WebSocket provider.
   */
  persistence?: "indexeddb" | "none";
}

export function getCollaborationConfig(
  features: Record<string, unknown>,
): CollaborationFeatureConfig | null {
  const raw = features.collaboration;
  if (!raw || typeof raw !== "object") return null;
  const cfg = raw as Partial<CollaborationFeatureConfig>;
  if (!cfg.provider?.url || !cfg.provider.room) return null;
  return {
    provider: cfg.provider,
    persistence: cfg.persistence ?? "indexeddb",
  };
}

interface CollaborationSession {
  ydoc: Y.Doc;
  /** Loaded async so SSR is safe. Resolves to null in non-browser envs. */
  provider: unknown | null;
}

const sessions = new Map<string, CollaborationSession>();

function sessionKey(documentId: string, cfg: CollaborationFeatureConfig) {
  return `${documentId}::${cfg.provider.url}::${cfg.provider.room}`;
}

/**
 * Lazily constructs a Y.Doc + WebsocketProvider pair the first time a
 * given (document, room) is requested. We cache by key so re-renders
 * don't tear down the live connection - tearing it down on every
 * render would drop awareness state and force a full resync.
 */
function getOrCreateSession(
  documentId: string,
  cfg: CollaborationFeatureConfig,
): CollaborationSession {
  const key = sessionKey(documentId, cfg);
  const existing = sessions.get(key);
  if (existing) return existing;

  const ydoc = new Y.Doc();
  const session: CollaborationSession = { ydoc, provider: null };
  sessions.set(key, session);

  if (typeof window !== "undefined") {
    // Defer browser-only modules so they never run during SSR.
    void import("y-websocket")
      .then(({ WebsocketProvider }) => {
        const params: Record<string, string> = {};
        if (cfg.provider.token) params.token = cfg.provider.token;
        session.provider = new WebsocketProvider(
          cfg.provider.url,
          cfg.provider.room,
          ydoc,
          { params },
        );
      })
      .catch((err) => {
        console.error("[collaboration] failed to load y-websocket", err);
      });

    if (cfg.persistence === "indexeddb") {
      void import("y-indexeddb")
        .then(({ IndexeddbPersistence }) => {
          new IndexeddbPersistence(`tiptap:${documentId}`, ydoc);
        })
        .catch((err) => {
          console.error("[collaboration] failed to load y-indexeddb", err);
        });
    }
  }

  return session;
}

const FALLBACK_USER_COLOR = "#2383e2";

export const collaborationModule: EditorExtensionModule = {
  id: "collaboration",
  name: "Collaborative editing",
  description:
    "Real-time multi-user editing over Yjs. Wire `features.collaboration.provider` to enable.",
  enabled: (ctx) => getCollaborationConfig(ctx.features) !== null,
  tiptap: (ctx: EditorExtensionContext) => {
    const cfg = getCollaborationConfig(ctx.features);
    if (!cfg) return [];
    const session = getOrCreateSession(ctx.documentId, cfg);

    const exts: AnyExtension[] = [
      Collaboration.configure({ document: session.ydoc }),
    ];

    // The caret extension needs an awareness-capable provider. We add
    // it unconditionally; if the provider hasn't loaded yet (still
    // resolving the dynamic import) the caret extension simply won't
    // show remote selections until awareness ticks in.
    exts.push(
      CollaborationCaret.configure({
        provider: session.provider,
        user: {
          name: ctx.user.name,
          color: ctx.user.color || FALLBACK_USER_COLOR,
          id: ctx.user.id,
        },
      }),
    );

    return exts;
  },
};
