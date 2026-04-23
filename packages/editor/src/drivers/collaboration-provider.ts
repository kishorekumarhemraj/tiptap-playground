import type * as Y from "yjs";

/**
 * Minimal shape the collaboration extension needs from whatever
 * provider the host wires up. We accept `unknown` for the awareness
 * object because y-protocols and Hocuspocus expose slightly
 * different surfaces; the caret extension only introspects it.
 */
export interface CollaborationProvider {
  /** The shared Y.Doc the editor binds to. */
  ydoc: Y.Doc;
  /** An awareness-capable provider instance (y-websocket, hocuspocus, tiptap-cloud). */
  awarenessProvider?: unknown;
  /** Optional display name for debug panels. */
  name?: string;
  destroy?(): void;
}

/**
 * Factory signature for producing a CollaborationProvider on demand.
 * The library calls this once per (documentId, host-key) and caches
 * the result; hosts can key cache invalidation through their own
 * factory logic (e.g. including a JWT in the closure).
 */
export type CollaborationProviderFactory = (args: {
  documentId: string;
}) => CollaborationProvider | null;
