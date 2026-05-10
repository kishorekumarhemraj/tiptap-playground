import type { CommentBody, CommentData, ThreadData } from "./types";
import { ThreadStore } from "./ThreadStore";
import { ThreadStoreAuth } from "./ThreadStoreAuth";

/** Permissive auth used by InMemoryThreadStore when no auth is supplied. */
class OpenAuth extends ThreadStoreAuth {
  canCreateThread() { return true; }
  canAddComment() { return true; }
  canUpdateComment() { return true; }
  canDeleteComment() { return true; }
  canDeleteThread() { return true; }
  canResolveThread() { return true; }
  canUnresolveThread() { return true; }
  canAddReaction() { return true; }
  canDeleteReaction() { return true; }
}

function uuid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

/**
 * Ephemeral in-memory thread store — suitable for the playground and
 * single-user scenarios. Swap for YjsThreadStore or TiptapThreadStore
 * for real-time collaborative use.
 */
export class InMemoryThreadStore extends ThreadStore {
  private threads = new Map<string, ThreadData>();
  private listeners = new Set<(threads: Map<string, ThreadData>) => void>();

  constructor(auth: ThreadStoreAuth = new OpenAuth()) {
    super(auth);
  }

  public addThreadToDocument = undefined;

  private notify() {
    const snap = new Map(this.threads);
    for (const l of this.listeners) l(snap);
  }

  public async createThread(options: {
    initialComment: { body: CommentBody; metadata?: any };
    metadata?: any;
  }): Promise<ThreadData> {
    const now = new Date();
    const comment: CommentData = {
      type: "comment",
      id: uuid(),
      userId: "local",
      createdAt: now,
      updatedAt: now,
      reactions: [],
      metadata: options.initialComment.metadata,
      body: options.initialComment.body,
    };
    const thread: ThreadData = {
      type: "thread",
      id: uuid(),
      createdAt: now,
      updatedAt: now,
      comments: [comment],
      resolved: false,
      metadata: options.metadata,
    };
    this.threads.set(thread.id, thread);
    this.notify();
    return thread;
  }

  public async addComment(options: {
    comment: { body: CommentBody; metadata?: any };
    threadId: string;
  }): Promise<CommentData> {
    const thread = this.threads.get(options.threadId);
    if (!thread) throw new Error(`Thread ${options.threadId} not found`);
    const now = new Date();
    const comment: CommentData = {
      type: "comment",
      id: uuid(),
      userId: "local",
      createdAt: now,
      updatedAt: now,
      reactions: [],
      metadata: options.comment.metadata,
      body: options.comment.body,
    };
    this.threads.set(options.threadId, {
      ...thread,
      comments: [...thread.comments, comment],
      updatedAt: now,
    });
    this.notify();
    return comment;
  }

  public async updateComment(options: {
    comment: { body: CommentBody; metadata?: any };
    threadId: string;
    commentId: string;
  }): Promise<void> {
    const thread = this.threads.get(options.threadId);
    if (!thread) return;
    const now = new Date();
    this.threads.set(options.threadId, {
      ...thread,
      comments: thread.comments.map((c) =>
        c.id === options.commentId
          ? { ...c, body: options.comment.body, updatedAt: now }
          : c,
      ),
      updatedAt: now,
    });
    this.notify();
  }

  public async deleteComment(options: {
    threadId: string;
    commentId: string;
  }): Promise<void> {
    const thread = this.threads.get(options.threadId);
    if (!thread) return;
    const now = new Date();
    this.threads.set(options.threadId, {
      ...thread,
      comments: thread.comments.map((c) =>
        c.id === options.commentId
          ? { ...c, deletedAt: now, updatedAt: now, body: undefined }
          : c,
      ),
      updatedAt: now,
    });
    this.notify();
  }

  public async deleteThread(options: { threadId: string }): Promise<void> {
    const thread = this.threads.get(options.threadId);
    if (!thread) return;
    this.threads.set(options.threadId, {
      ...thread,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
    this.notify();
  }

  public async resolveThread(options: { threadId: string }): Promise<void> {
    const thread = this.threads.get(options.threadId);
    if (!thread) return;
    this.threads.set(options.threadId, {
      ...thread,
      resolved: true,
      resolvedUpdatedAt: new Date(),
      updatedAt: new Date(),
    });
    this.notify();
  }

  public async unresolveThread(options: { threadId: string }): Promise<void> {
    const thread = this.threads.get(options.threadId);
    if (!thread) return;
    this.threads.set(options.threadId, {
      ...thread,
      resolved: false,
      resolvedUpdatedAt: new Date(),
      updatedAt: new Date(),
    });
    this.notify();
  }

  public async addReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<void> {
    // Reactions not tracked in the in-memory store for simplicity.
  }

  public async deleteReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<void> {
    // Reactions not tracked in the in-memory store for simplicity.
  }

  public getThread(threadId: string): ThreadData {
    const t = this.threads.get(threadId);
    if (!t) throw new Error(`Thread ${threadId} not found`);
    return t;
  }

  public getThreads(): Map<string, ThreadData> {
    return new Map(this.threads);
  }

  public subscribe(cb: (threads: Map<string, ThreadData>) => void): () => void {
    this.listeners.add(cb);
    cb(new Map(this.threads));
    return () => this.listeners.delete(cb);
  }
}
