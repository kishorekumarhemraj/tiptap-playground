import type { CommentData, ThreadData } from "./types";
import { ThreadStoreAuth } from "./ThreadStoreAuth";

/*
 * Role-based auth for comment operations.
 *
 * Rules:
 * - "comment" and "editor" roles can: create threads, add comments/reactions,
 *   edit/delete their own comments, resolve/unresolve threads.
 * - "editor" role can also delete any comment or thread.
 */
export class DefaultThreadStoreAuth extends ThreadStoreAuth {
  constructor(
    private readonly userId: string,
    private readonly role: "comment" | "editor",
  ) {
    super();
  }

  canCreateThread(): boolean {
    return true;
  }

  canAddComment(_thread: ThreadData): boolean {
    return true;
  }

  canUpdateComment(comment: CommentData): boolean {
    return comment.userId === this.userId;
  }

  canDeleteComment(comment: CommentData): boolean {
    return comment.userId === this.userId || this.role === "editor";
  }

  canDeleteThread(_thread: ThreadData): boolean {
    return this.role === "editor";
  }

  canResolveThread(_thread: ThreadData): boolean {
    return true;
  }

  canUnresolveThread(_thread: ThreadData): boolean {
    return true;
  }

  canAddReaction(comment: CommentData, emoji?: string): boolean {
    if (!emoji) return true;
    return !comment.reactions.some(
      (r) => r.emoji === emoji && r.userIds.includes(this.userId),
    );
  }

  canDeleteReaction(comment: CommentData, emoji?: string): boolean {
    if (!emoji) return true;
    return comment.reactions.some(
      (r) => r.emoji === emoji && r.userIds.includes(this.userId),
    );
  }
}
