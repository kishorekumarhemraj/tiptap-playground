/** The body of a comment. Plain text for now; can be upgraded to rich content. */
export type CommentBody = any;

export type CommentReactionData = {
  emoji: string;
  createdAt: Date;
  userIds: string[];
};

export type CommentData = {
  type: "comment";
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  reactions: CommentReactionData[];
  metadata: any;
} & (
  | {
      deletedAt: Date;
      body: undefined;
    }
  | {
      deletedAt?: never;
      body: CommentBody;
    }
);

export type ThreadData = {
  type: "thread";
  id: string;
  createdAt: Date;
  updatedAt: Date;
  comments: CommentData[];
  resolved: boolean;
  resolvedUpdatedAt?: Date;
  resolvedBy?: string;
  metadata: any;
  deletedAt?: Date;
};

export type User = {
  id: string;
  username: string;
  avatarUrl: string;
};
