/** Body of a comment — plain text for now, can be upgraded to rich content later. */
export type CommentBody = string;

export type CommentData = {
  id: string;
  threadId: string;
  userId: string;
  authorName: string;
  body: CommentBody;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
};

export type ThreadData = {
  id: string;
  comments: CommentData[];
  resolved: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
};

/**
 * Pluggable storage for comment threads. Hosts supply a concrete
 * implementation — in-memory for local-only, REST/WebSocket for
 * collaborative scenarios, or Yjs-backed for offline-first.
 */
export abstract class ThreadStore {
  abstract createThread(options: {
    threadId: string;
    initialComment: { userId: string; authorName: string; body: CommentBody };
  }): Promise<ThreadData> | ThreadData;

  abstract addComment(options: {
    threadId: string;
    comment: { userId: string; authorName: string; body: CommentBody };
  }): Promise<CommentData> | CommentData;

  abstract updateComment(options: {
    threadId: string;
    commentId: string;
    body: CommentBody;
  }): Promise<void> | void;

  abstract deleteComment(options: {
    threadId: string;
    commentId: string;
  }): Promise<void> | void;

  abstract deleteThread(options: { threadId: string }): Promise<void> | void;

  abstract resolveThread(options: {
    threadId: string;
    resolved: boolean;
  }): Promise<void> | void;

  abstract getThread(threadId: string): ThreadData | undefined;
  abstract getThreads(): Map<string, ThreadData>;

  abstract subscribe(cb: (threads: Map<string, ThreadData>) => void): () => void;
}

function uuid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);
}

/**
 * Simple in-memory thread store — suitable for the playground and
 * single-user use-cases. Swap for a Yjs or HTTP-backed store for
 * real-time collaboration.
 */
export class InMemoryThreadStore extends ThreadStore {
  private threads = new Map<string, ThreadData>();
  private listeners = new Set<(threads: Map<string, ThreadData>) => void>();

  private notify() {
    const snapshot = new Map(this.threads);
    for (const l of this.listeners) l(snapshot);
  }

  createThread({
    threadId,
    initialComment,
  }: {
    threadId: string;
    initialComment: { userId: string; authorName: string; body: CommentBody };
  }): ThreadData {
    const now = Date.now();
    const comment: CommentData = {
      id: uuid(),
      threadId,
      userId: initialComment.userId,
      authorName: initialComment.authorName,
      body: initialComment.body,
      createdAt: now,
      updatedAt: now,
    };
    const thread: ThreadData = {
      id: threadId,
      comments: [comment],
      resolved: false,
      createdAt: now,
      updatedAt: now,
    };
    this.threads.set(threadId, thread);
    this.notify();
    return thread;
  }

  addComment({
    threadId,
    comment,
  }: {
    threadId: string;
    comment: { userId: string; authorName: string; body: CommentBody };
  }): CommentData {
    const thread = this.threads.get(threadId);
    if (!thread) throw new Error(`Thread ${threadId} not found`);
    const now = Date.now();
    const c: CommentData = {
      id: uuid(),
      threadId,
      userId: comment.userId,
      authorName: comment.authorName,
      body: comment.body,
      createdAt: now,
      updatedAt: now,
    };
    this.threads.set(threadId, {
      ...thread,
      comments: [...thread.comments, c],
      updatedAt: now,
    });
    this.notify();
    return c;
  }

  updateComment({
    threadId,
    commentId,
    body,
  }: {
    threadId: string;
    commentId: string;
    body: CommentBody;
  }): void {
    const thread = this.threads.get(threadId);
    if (!thread) return;
    const now = Date.now();
    this.threads.set(threadId, {
      ...thread,
      comments: thread.comments.map((c) =>
        c.id === commentId ? { ...c, body, updatedAt: now } : c,
      ),
      updatedAt: now,
    });
    this.notify();
  }

  deleteComment({
    threadId,
    commentId,
  }: {
    threadId: string;
    commentId: string;
  }): void {
    const thread = this.threads.get(threadId);
    if (!thread) return;
    const now = Date.now();
    this.threads.set(threadId, {
      ...thread,
      comments: thread.comments.map((c) =>
        c.id === commentId ? { ...c, deletedAt: now, updatedAt: now } : c,
      ),
      updatedAt: now,
    });
    this.notify();
  }

  deleteThread({ threadId }: { threadId: string }): void {
    const thread = this.threads.get(threadId);
    if (!thread) return;
    const now = Date.now();
    this.threads.set(threadId, { ...thread, deletedAt: now, updatedAt: now });
    this.notify();
  }

  resolveThread({
    threadId,
    resolved,
  }: {
    threadId: string;
    resolved: boolean;
  }): void {
    const thread = this.threads.get(threadId);
    if (!thread) return;
    this.threads.set(threadId, {
      ...thread,
      resolved,
      updatedAt: Date.now(),
    });
    this.notify();
  }

  getThread(threadId: string): ThreadData | undefined {
    return this.threads.get(threadId);
  }

  getThreads(): Map<string, ThreadData> {
    return new Map(this.threads);
  }

  subscribe(cb: (threads: Map<string, ThreadData>) => void): () => void {
    this.listeners.add(cb);
    cb(new Map(this.threads));
    return () => this.listeners.delete(cb);
  }
}
