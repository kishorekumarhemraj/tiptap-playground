import { uuidv4 } from "lib0/random";
import * as Y from "yjs";
import type { CommentBody, CommentData, ThreadData } from "../types";
import type { ThreadStoreAuth } from "../ThreadStoreAuth";
import { YjsThreadStoreBase } from "./YjsThreadStoreBase";
import {
  commentToYMap,
  threadToYMap,
  yMapToComment,
  yMapToThread,
} from "./yjsHelpers";

/**
 * Yjs-backed thread store that reads/writes directly into the shared Y.Doc.
 *
 * Trade-offs vs RESTYjsThreadStore:
 * - Simpler setup (no server endpoint needed)
 * - All users must have write access to the Yjs document
 * - No server-side permission enforcement — a malicious client could
 *   bypass the auth checks in this class
 */
export class YjsThreadStore extends YjsThreadStoreBase {
  constructor(
    private readonly userId: string,
    threadsYMap: Y.Map<any>,
    auth: ThreadStoreAuth,
  ) {
    super(threadsYMap, auth);
  }

  private transact = <T, R>(fn: (options: T) => R) =>
    async (options: T): Promise<R> =>
      this.threadsYMap.doc!.transact(() => fn(options));

  public createThread = this.transact(
    (options: {
      initialComment: { body: CommentBody; metadata?: any };
      metadata?: any;
    }): ThreadData => {
      if (!this.auth.canCreateThread()) throw new Error("Not authorized");

      const date = new Date();
      const comment: CommentData = {
        type: "comment",
        id: uuidv4(),
        userId: this.userId,
        createdAt: date,
        updatedAt: date,
        reactions: [],
        metadata: options.initialComment.metadata,
        body: options.initialComment.body,
      };
      const thread: ThreadData = {
        type: "thread",
        id: uuidv4(),
        createdAt: date,
        updatedAt: date,
        comments: [comment],
        resolved: false,
        metadata: options.metadata,
      };
      this.threadsYMap.set(thread.id, threadToYMap(thread));
      return thread;
    },
  );

  public addThreadToDocument = undefined;

  public addComment = this.transact(
    (options: {
      comment: { body: CommentBody; metadata?: any };
      threadId: string;
    }): CommentData => {
      const yThread = this.threadsYMap.get(options.threadId);
      if (!yThread) throw new Error("Thread not found");
      if (!this.auth.canAddComment(yMapToThread(yThread)))
        throw new Error("Not authorized");

      const date = new Date();
      const comment: CommentData = {
        type: "comment",
        id: uuidv4(),
        userId: this.userId,
        createdAt: date,
        updatedAt: date,
        reactions: [],
        metadata: options.comment.metadata,
        body: options.comment.body,
      };
      (yThread.get("comments") as Y.Array<Y.Map<any>>).push([
        commentToYMap(comment),
      ]);
      yThread.set("updatedAt", date.getTime());
      return comment;
    },
  );

  public updateComment = this.transact(
    (options: {
      comment: { body: CommentBody; metadata?: any };
      threadId: string;
      commentId: string;
    }): void => {
      const yThread = this.threadsYMap.get(options.threadId);
      if (!yThread) throw new Error("Thread not found");

      const idx = yArrayFindIndex(
        yThread.get("comments"),
        (c) => c.get("id") === options.commentId,
      );
      if (idx === -1) throw new Error("Comment not found");

      const yComment = yThread.get("comments").get(idx);
      if (!this.auth.canUpdateComment(yMapToComment(yComment)))
        throw new Error("Not authorized");

      yComment.set("body", options.comment.body);
      yComment.set("updatedAt", new Date().getTime());
      yComment.set("metadata", options.comment.metadata);
    },
  );

  public deleteComment = this.transact(
    (options: { threadId: string; commentId: string; softDelete?: boolean }): void => {
      const yThread = this.threadsYMap.get(options.threadId);
      if (!yThread) throw new Error("Thread not found");

      const idx = yArrayFindIndex(
        yThread.get("comments"),
        (c) => c.get("id") === options.commentId,
      );
      if (idx === -1) throw new Error("Comment not found");

      const yComment = yThread.get("comments").get(idx);
      if (!this.auth.canDeleteComment(yMapToComment(yComment)))
        throw new Error("Not authorized");
      if (yComment.get("deletedAt")) throw new Error("Comment already deleted");

      if (options.softDelete) {
        yComment.set("deletedAt", new Date().getTime());
        yComment.set("body", undefined);
      } else {
        yThread.get("comments").delete(idx);
      }

      const allDeleted = (yThread.get("comments") as Y.Array<any>)
        .toArray()
        .every((c) => c.get("deletedAt"));
      if (allDeleted) {
        if (options.softDelete) yThread.set("deletedAt", new Date().getTime());
        else this.threadsYMap.delete(options.threadId);
      }

      yThread.set("updatedAt", new Date().getTime());
    },
  );

  public deleteThread = this.transact((options: { threadId: string }): void => {
    if (
      !this.auth.canDeleteThread(
        yMapToThread(this.threadsYMap.get(options.threadId)),
      )
    )
      throw new Error("Not authorized");
    this.threadsYMap.delete(options.threadId);
  });

  public resolveThread = this.transact((options: { threadId: string }): void => {
    const yThread = this.threadsYMap.get(options.threadId);
    if (!yThread) throw new Error("Thread not found");
    if (!this.auth.canResolveThread(yMapToThread(yThread)))
      throw new Error("Not authorized");
    yThread.set("resolved", true);
    yThread.set("resolvedUpdatedAt", new Date().getTime());
    yThread.set("resolvedBy", this.userId);
  });

  public unresolveThread = this.transact(
    (options: { threadId: string }): void => {
      const yThread = this.threadsYMap.get(options.threadId);
      if (!yThread) throw new Error("Thread not found");
      if (!this.auth.canUnresolveThread(yMapToThread(yThread)))
        throw new Error("Not authorized");
      yThread.set("resolved", false);
      yThread.set("resolvedUpdatedAt", new Date().getTime());
    },
  );

  public addReaction = this.transact(
    (options: { threadId: string; commentId: string; emoji: string }): void => {
      const yThread = this.threadsYMap.get(options.threadId);
      if (!yThread) throw new Error("Thread not found");

      const idx = yArrayFindIndex(
        yThread.get("comments"),
        (c) => c.get("id") === options.commentId,
      );
      if (idx === -1) throw new Error("Comment not found");

      const yComment = yThread.get("comments").get(idx);
      if (!this.auth.canAddReaction(yMapToComment(yComment), options.emoji))
        throw new Error("Not authorized");

      const key = `${this.userId}-${options.emoji}`;
      const reactionsByUser: Y.Map<any> = yComment.get("reactionsByUser");
      if (reactionsByUser.has(key)) return;

      const reaction = new Y.Map();
      reaction.set("emoji", options.emoji);
      reaction.set("createdAt", new Date().getTime());
      reaction.set("userId", this.userId);
      reactionsByUser.set(key, reaction);
    },
  );

  public deleteReaction = this.transact(
    (options: { threadId: string; commentId: string; emoji: string }): void => {
      const yThread = this.threadsYMap.get(options.threadId);
      if (!yThread) throw new Error("Thread not found");

      const idx = yArrayFindIndex(
        yThread.get("comments"),
        (c) => c.get("id") === options.commentId,
      );
      if (idx === -1) throw new Error("Comment not found");

      const yComment = yThread.get("comments").get(idx);
      if (!this.auth.canDeleteReaction(yMapToComment(yComment), options.emoji))
        throw new Error("Not authorized");

      const key = `${this.userId}-${options.emoji}`;
      (yComment.get("reactionsByUser") as Y.Map<any>).delete(key);
    },
  );
}

function yArrayFindIndex(yArray: Y.Array<any>, predicate: (item: any) => boolean): number {
  for (let i = 0; i < yArray.length; i++) {
    if (predicate(yArray.get(i))) return i;
  }
  return -1;
}
