import type {
  CommentBody,
  CommentData,
  CommentReactionData,
  ThreadData,
} from "./types";
import { ThreadStore } from "./ThreadStore";
import type { ThreadStoreAuth } from "./ThreadStoreAuth";
import type {
  TCollabComment,
  TCollabThread,
  TiptapCollabProvider,
} from "./tiptap/types";

type ReactionAsTiptapData = {
  emoji: string;
  createdAt: number;
  userId: string;
};

/**
 * ThreadStore backed by a TipTap collaboration provider (hocuspocus /
 * TipTap Cloud). Comments are stored in the shared Yjs document via the
 * provider's thread API, so all collaborators see updates in real time.
 */
export class TiptapThreadStore extends ThreadStore {
  constructor(
    private readonly userId: string,
    private readonly provider: TiptapCollabProvider,
    auth: ThreadStoreAuth,
  ) {
    super(auth);
  }

  public async createThread(options: {
    initialComment: { body: CommentBody; metadata?: any };
    metadata?: any;
  }): Promise<ThreadData> {
    let thread = this.provider.createThread({ data: options.metadata });
    thread = this.provider.addComment(thread.id, {
      content: options.initialComment.body,
      data: {
        metadata: options.initialComment.metadata,
        userId: this.userId,
      },
    });
    return this.toThreadData(thread);
  }

  public addThreadToDocument = undefined;

  public async addComment(options: {
    comment: { body: CommentBody; metadata?: any };
    threadId: string;
  }): Promise<CommentData> {
    const thread = this.provider.addComment(options.threadId, {
      content: options.comment.body,
      data: { metadata: options.comment.metadata, userId: this.userId },
    });
    return this.toCommentData(thread.comments[thread.comments.length - 1]);
  }

  public async updateComment(options: {
    comment: { body: CommentBody; metadata?: any };
    threadId: string;
    commentId: string;
  }): Promise<void> {
    const comment = this.provider.getThreadComment(
      options.threadId,
      options.commentId,
      true,
    );
    if (!comment) throw new Error("Comment not found");
    this.provider.updateComment(options.threadId, options.commentId, {
      content: options.comment.body,
      data: { ...comment.data, metadata: options.comment.metadata },
    });
  }

  public async deleteComment(options: {
    threadId: string;
    commentId: string;
  }): Promise<void> {
    this.provider.deleteComment(options.threadId, options.commentId);
  }

  public async deleteThread(options: { threadId: string }): Promise<void> {
    this.provider.deleteThread(options.threadId);
  }

  public async resolveThread(options: { threadId: string }): Promise<void> {
    this.provider.updateThread(options.threadId, {
      resolvedAt: new Date().toISOString(),
    });
  }

  public async unresolveThread(options: { threadId: string }): Promise<void> {
    this.provider.updateThread(options.threadId, { resolvedAt: null });
  }

  public async addReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<void> {
    const comment = this.provider.getThreadComment(
      options.threadId,
      options.commentId,
      true,
    );
    if (!comment) throw new Error("Comment not found");
    this.provider.updateComment(options.threadId, options.commentId, {
      data: {
        ...comment.data,
        reactions: [
          ...((comment.data?.reactions ?? []) as ReactionAsTiptapData[]),
          { emoji: options.emoji, createdAt: Date.now(), userId: this.userId },
        ],
      },
    });
  }

  public async deleteReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<void> {
    const comment = this.provider.getThreadComment(
      options.threadId,
      options.commentId,
      true,
    );
    if (!comment) throw new Error("Comment not found");
    this.provider.updateComment(options.threadId, options.commentId, {
      data: {
        ...comment.data,
        reactions: (
          (comment.data?.reactions ?? []) as ReactionAsTiptapData[]
        ).filter(
          (r) => !(r.emoji === options.emoji && r.userId === this.userId),
        ),
      },
    });
  }

  public getThread(threadId: string): ThreadData {
    const thread = this.provider.getThread(threadId);
    if (!thread) throw new Error("Thread not found");
    return this.toThreadData(thread);
  }

  public getThreads(): Map<string, ThreadData> {
    return new Map(
      this.provider.getThreads().map((t) => [t.id, this.toThreadData(t)]),
    );
  }

  public subscribe(cb: (threads: Map<string, ThreadData>) => void): () => void {
    const notify = () => cb(this.getThreads());
    this.provider.watchThreads(notify);
    return () => this.provider.unwatchThreads(notify);
  }

  private toCommentData(comment: TCollabComment): CommentData {
    const reactions: CommentReactionData[] = [];
    for (const r of (comment.data?.reactions ?? []) as ReactionAsTiptapData[]) {
      const existing = reactions.find((a) => a.emoji === r.emoji);
      if (existing) {
        existing.userIds.push(r.userId);
        existing.createdAt = new Date(
          Math.min(existing.createdAt.getTime(), r.createdAt),
        );
      } else {
        reactions.push({
          emoji: r.emoji,
          createdAt: new Date(r.createdAt),
          userIds: [r.userId],
        });
      }
    }
    return {
      type: "comment",
      id: comment.id,
      body: comment.content,
      metadata: comment.data?.metadata,
      userId: comment.data?.userId,
      createdAt: new Date(comment.createdAt),
      updatedAt: new Date(comment.updatedAt),
      reactions,
    };
  }

  private toThreadData(thread: TCollabThread): ThreadData {
    return {
      type: "thread",
      id: thread.id,
      comments: thread.comments.map((c) => this.toCommentData(c)),
      resolved: !!thread.resolvedAt,
      metadata: thread.data?.metadata,
      createdAt: new Date(thread.createdAt),
      updatedAt: new Date(thread.updatedAt),
    };
  }
}
