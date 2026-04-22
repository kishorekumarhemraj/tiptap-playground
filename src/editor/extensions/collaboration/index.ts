import type { EditorExtensionModule } from "../../types";

/**
 * Collaborative editing stub.
 *
 * When this is implemented it will provide two TipTap extensions:
 *
 *   - `@tiptap/extension-collaboration` bound to a Y.Doc shared via
 *     `y-websocket` (or hocuspocus) so every peer applies the same
 *     CRDT updates.
 *   - `@tiptap/extension-collaboration-cursor` which projects each
 *     peer's selection as a remote caret using `ctx.user.{name,color}`.
 *
 * The module is kept disabled until a `features.collaboration.provider`
 * entry is present in the context so the app builds without a backend.
 */
export interface CollaborationFeatureConfig {
  provider: {
    url: string;
    room: string;
    token?: string;
  };
}

function getConfig(features: Record<string, unknown>): CollaborationFeatureConfig | null {
  const raw = features.collaboration;
  if (!raw || typeof raw !== "object") return null;
  const cfg = raw as Partial<CollaborationFeatureConfig>;
  if (!cfg.provider?.url || !cfg.provider.room) return null;
  return cfg as CollaborationFeatureConfig;
}

export const collaborationModule: EditorExtensionModule = {
  id: "collaboration",
  name: "Collaborative editing",
  description:
    "Real-time multi-user editing over Yjs. Wire `features.collaboration.provider` to enable.",
  enabled: (ctx) => getConfig(ctx.features) !== null,
  tiptap: () => {
    // Intentionally empty: flip `enabled` on and add the real
    // `Collaboration`/`CollaborationCursor` extensions here. This is
    // the one-file change needed to light up real-time collab.
    return [];
  },
};
