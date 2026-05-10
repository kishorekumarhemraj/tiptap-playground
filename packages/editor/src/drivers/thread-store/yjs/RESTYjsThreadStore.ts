import * as Y from "yjs";
import type { CommentBody } from "../types";
import type { ThreadStoreAuth } from "../ThreadStoreAuth";
import { YjsThreadStoreBase } from "./YjsThreadStoreBase";

/**
 * REST-backed thread store that reads from the shared Yjs document
 * but delegates all writes to a server endpoint.
 *
 * The server is responsible for permission checks and applying changes
 * back to the Yjs document so all collaborators see them in real time.
 *
 * See https://github.com/TypeCellOS/BlockNote-demo-nextjs-hocuspocus
 * for a reference backend implementation.
 */
export class RESTYjsThreadStore extends YjsThreadStoreBase {
  constructor(
    private readonly baseUrl: string,
    private readonly headers: Record<string, string>,
    threadsYMap: Y.Map<any>,
    auth: ThreadStoreAuth,
  ) {
    super(threadsYMap, auth);
  }

  private async request(path: string, method: string, body?: any) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: { "Content-Type": "application/json", ...this.headers },
    });
    if (!res.ok)
      throw new Error(`${method} ${path} failed: ${res.statusText}`);
    return res.json();
  }

  public addThreadToDocument = async (options: {
    threadId: string;
    selection: {
      prosemirror: { head: number; anchor: number };
      yjs: { head: any; anchor: any };
    };
  }) => {
    const { threadId, ...rest } = options;
    return this.request(`/${threadId}/addToDocument`, "POST", rest);
  };

  public createThread = (options: {
    initialComment: { body: CommentBody; metadata?: any };
    metadata?: any;
  }) => this.request("", "POST", options);

  public addComment = (options: {
    comment: { body: CommentBody; metadata?: any };
    threadId: string;
  }) => {
    const { threadId, ...rest } = options;
    return this.request(`/${threadId}/comments`, "POST", rest);
  };

  public updateComment = (options: {
    comment: { body: CommentBody; metadata?: any };
    threadId: string;
    commentId: string;
  }) => {
    const { threadId, commentId, ...rest } = options;
    return this.request(`/${threadId}/comments/${commentId}`, "PUT", rest);
  };

  public deleteComment = (options: {
    threadId: string;
    commentId: string;
    softDelete?: boolean;
  }) => {
    const { threadId, commentId, softDelete } = options;
    return this.request(
      `/${threadId}/comments/${commentId}?soft=${!!softDelete}`,
      "DELETE",
    );
  };

  public deleteThread = (options: { threadId: string }) =>
    this.request(`/${options.threadId}`, "DELETE");

  public resolveThread = (options: { threadId: string }) =>
    this.request(`/${options.threadId}/resolve`, "POST");

  public unresolveThread = (options: { threadId: string }) =>
    this.request(`/${options.threadId}/unresolve`, "POST");

  public addReaction = (options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) => {
    const { threadId, commentId, ...rest } = options;
    return this.request(
      `/${threadId}/comments/${commentId}/reactions`,
      "POST",
      rest,
    );
  };

  public deleteReaction = (options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) =>
    this.request(
      `/${options.threadId}/comments/${options.commentId}/reactions/${options.emoji}`,
      "DELETE",
    );
}
