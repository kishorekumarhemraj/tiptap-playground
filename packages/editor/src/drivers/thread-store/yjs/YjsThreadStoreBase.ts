import * as Y from "yjs";
import type { ThreadData } from "../types";
import { ThreadStore } from "../ThreadStore";
import type { ThreadStoreAuth } from "../ThreadStoreAuth";
import { yMapToThread } from "./yjsHelpers";

/**
 * Read-only base that surfaces thread data from a Yjs map.
 * Write implementations live in YjsThreadStore (local) and
 * RESTYjsThreadStore (server-authoritative).
 */
export abstract class YjsThreadStoreBase extends ThreadStore {
  constructor(
    protected readonly threadsYMap: Y.Map<any>,
    auth: ThreadStoreAuth,
  ) {
    super(auth);
  }

  public getThread(threadId: string): ThreadData {
    const yThread = this.threadsYMap.get(threadId);
    if (!yThread) throw new Error("Thread not found");
    return yMapToThread(yThread);
  }

  public getThreads(): Map<string, ThreadData> {
    const map = new Map<string, ThreadData>();
    this.threadsYMap.forEach((yThread, id) => {
      if (yThread instanceof Y.Map) map.set(id, yMapToThread(yThread));
    });
    return map;
  }

  public subscribe(cb: (threads: Map<string, ThreadData>) => void): () => void {
    const observer = () => cb(this.getThreads());
    this.threadsYMap.observeDeep(observer);
    return () => this.threadsYMap.unobserveDeep(observer);
  }
}
