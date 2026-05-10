/**
 * Tiptap collaboration provider comment types.
 * Extracted from @hocuspocus/provider to avoid a direct dependency.
 */

export type TCollabThread<Data = any, CommentData = any> = {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  resolvedAt?: string;
  comments: TCollabComment<CommentData>[];
  deletedComments: TCollabComment<CommentData>[];
  data: Data;
};

export type TCollabComment<Data = any> = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  data: Data;
  content: any;
};

export type ThreadType = "archived" | "unarchived";

export type GetThreadsOptions = {
  types?: Array<ThreadType>;
};

export type DeleteCommentOptions = {
  deleteThread?: boolean;
  deleteContent?: boolean;
};

export type DeleteThreadOptions = {
  deleteComments?: boolean;
  force?: boolean;
};

export type TiptapCollabProvider = {
  getThread<Data, CommentData>(
    id: string,
  ): TCollabThread<Data, CommentData> | null;

  getThreads<Data, CommentData>(
    options?: GetThreadsOptions,
  ): TCollabThread<Data, CommentData>[];

  createThread(
    data: Omit<
      TCollabThread,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "deletedAt"
      | "comments"
      | "deletedComments"
    >,
  ): TCollabThread;

  addComment(
    threadId: TCollabThread["id"],
    data: Omit<TCollabComment, "id" | "updatedAt" | "createdAt">,
  ): TCollabThread;

  updateComment(
    threadId: TCollabThread["id"],
    commentId: TCollabComment["id"],
    data: Partial<Pick<TCollabComment, "data" | "content">>,
  ): TCollabThread;

  deleteComment(
    threadId: TCollabThread["id"],
    commentId: TCollabComment["id"],
    options?: DeleteCommentOptions,
  ): TCollabThread;

  getThreadComments(
    threadId: TCollabThread["id"],
    includeDeleted?: boolean,
  ): TCollabComment[] | null;

  getThreadComment(
    threadId: TCollabThread["id"],
    commentId: TCollabComment["id"],
    includeDeleted?: boolean,
  ): TCollabComment | null;

  deleteThread(
    id: TCollabThread["id"],
    options?: DeleteThreadOptions,
  ): TCollabThread;

  updateThread(
    id: TCollabThread["id"],
    data: Partial<
      Pick<TCollabThread, "data"> & {
        resolvedAt: TCollabThread["resolvedAt"] | null;
      }
    >,
  ): TCollabThread;

  watchThreads(callback: () => void): void;
  unwatchThreads(callback: () => void): void;
};
