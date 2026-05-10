import type { CommentBody, CommentData, ThreadData } from "./types";
import type { ThreadStoreAuth } from "./ThreadStoreAuth";

/**
 * Abstract base for thread/comment storage backends.
 * Implementations range from in-memory (playground) to Yjs-backed
 * (offline-first collab) to REST (server-authoritative).
 */
export abstract class ThreadStore {
  public readonly auth: ThreadStoreAuth;

  constructor(auth: ThreadStoreAuth) {
    this.auth = auth;
  }

  /**
   * Optional: store the thread mark directly in the document (e.g. via Yjs).
   * If absent, the extension applies the mark via TipTap commands.
   */
  abstract addThreadToDocument?(options: {
    threadId: string;
    selection: {
      prosemirror: { head: number; anchor: number };
      yjs?: { head: any; anchor: any };
    };
  }): Promise<void>;

  abstract createThread(options: {
    initialComment: { body: CommentBody; metadata?: any };
    metadata?: any;
  }): Promise<ThreadData>;

  abstract addComment(options: {
    comment: { body: CommentBody; metadata?: any };
    threadId: string;
  }): Promise<CommentData>;

  abstract updateComment(options: {
    comment: { body: CommentBody; metadata?: any };
    threadId: string;
    commentId: string;
  }): Promise<void>;

  abstract deleteComment(options: {
    threadId: string;
    commentId: string;
  }): Promise<void>;

  abstract deleteThread(options: { threadId: string }): Promise<void>;

  abstract resolveThread(options: { threadId: string }): Promise<void>;

  abstract unresolveThread(options: { threadId: string }): Promise<void>;

  abstract addReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<void>;

  abstract deleteReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<void>;

  abstract getThread(threadId: string): ThreadData;

  abstract getThreads(): Map<string, ThreadData>;

  abstract subscribe(
    cb: (threads: Map<string, ThreadData>) => void,
  ): () => void;
}
