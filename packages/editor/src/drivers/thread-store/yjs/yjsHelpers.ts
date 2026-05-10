import * as Y from "yjs";
import type { CommentData, CommentReactionData, ThreadData } from "../types";

export function commentToYMap(comment: CommentData) {
  const yMap = new Y.Map<any>();
  yMap.set("id", comment.id);
  yMap.set("userId", comment.userId);
  yMap.set("createdAt", comment.createdAt.getTime());
  yMap.set("updatedAt", comment.updatedAt.getTime());
  if (comment.deletedAt) {
    yMap.set("deletedAt", comment.deletedAt.getTime());
    yMap.set("body", undefined);
  } else {
    yMap.set("body", comment.body);
  }
  if (comment.reactions.length > 0) {
    throw new Error("Reactions must be empty in commentToYMap");
  }
  yMap.set("reactionsByUser", new Y.Map());
  yMap.set("metadata", comment.metadata);
  return yMap;
}

export function threadToYMap(thread: ThreadData) {
  const yMap = new Y.Map();
  yMap.set("id", thread.id);
  yMap.set("createdAt", thread.createdAt.getTime());
  yMap.set("updatedAt", thread.updatedAt.getTime());
  const commentsArray = new Y.Array<Y.Map<any>>();
  commentsArray.push(thread.comments.map((c) => commentToYMap(c)));
  yMap.set("comments", commentsArray);
  yMap.set("resolved", thread.resolved);
  yMap.set("resolvedUpdatedAt", thread.resolvedUpdatedAt?.getTime());
  yMap.set("resolvedBy", thread.resolvedBy);
  yMap.set("metadata", thread.metadata);
  return yMap;
}

type SingleUserReaction = { emoji: string; createdAt: Date; userId: string };

export function yMapToReaction(yMap: Y.Map<any>): SingleUserReaction {
  return {
    emoji: yMap.get("emoji"),
    createdAt: new Date(yMap.get("createdAt")),
    userId: yMap.get("userId"),
  };
}

function yMapToReactions(yMap: Y.Map<any>): CommentReactionData[] {
  const flat = [...yMap.values()].map((r: Y.Map<any>) => yMapToReaction(r));
  return flat.reduce((acc: CommentReactionData[], r: SingleUserReaction) => {
    const existing = acc.find((a) => a.emoji === r.emoji);
    if (existing) {
      existing.userIds.push(r.userId);
      existing.createdAt = new Date(
        Math.min(existing.createdAt.getTime(), r.createdAt.getTime()),
      );
    } else {
      acc.push({ emoji: r.emoji, createdAt: r.createdAt, userIds: [r.userId] });
    }
    return acc;
  }, []);
}

export function yMapToComment(yMap: Y.Map<any>): CommentData {
  return {
    type: "comment",
    id: yMap.get("id"),
    userId: yMap.get("userId"),
    createdAt: new Date(yMap.get("createdAt")),
    updatedAt: new Date(yMap.get("updatedAt")),
    deletedAt: yMap.get("deletedAt")
      ? new Date(yMap.get("deletedAt"))
      : undefined,
    reactions: yMapToReactions(yMap.get("reactionsByUser")),
    metadata: yMap.get("metadata"),
    body: yMap.get("body"),
  };
}

export function yMapToThread(yMap: Y.Map<any>): ThreadData {
  return {
    type: "thread",
    id: yMap.get("id"),
    createdAt: new Date(yMap.get("createdAt")),
    updatedAt: new Date(yMap.get("updatedAt")),
    comments: (
      (yMap.get("comments") as Y.Array<Y.Map<any>>) || []
    ).map((c) => yMapToComment(c)),
    resolved: yMap.get("resolved"),
    resolvedUpdatedAt: yMap.get("resolvedUpdatedAt")
      ? new Date(yMap.get("resolvedUpdatedAt"))
      : undefined,
    resolvedBy: yMap.get("resolvedBy"),
    metadata: yMap.get("metadata"),
  };
}
