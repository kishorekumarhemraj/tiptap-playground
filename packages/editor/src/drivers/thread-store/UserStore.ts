import { EventEmitter } from "../../util/EventEmitter";
import type { User } from "./types";

/**
 * Resolves and caches user info by id, calling the host-supplied
 * `resolveUsers` function for any ids not yet in cache.
 */
export class UserStore<U extends User> extends EventEmitter<{
  update: Map<string, U>;
}> {
  private userCache: Map<string, U> = new Map();
  private loadingUsers = new Set<string>();

  constructor(
    private readonly resolveUsers: (userIds: string[]) => Promise<U[]>,
  ) {
    super();
  }

  async loadUsers(userIds: string[]) {
    const missing = userIds.filter(
      (id) => !this.userCache.has(id) && !this.loadingUsers.has(id),
    );
    if (missing.length === 0) return;

    for (const id of missing) this.loadingUsers.add(id);

    try {
      const users = await this.resolveUsers(missing);
      for (const user of users) this.userCache.set(user.id, user);
      this.emit("update", this.userCache);
    } finally {
      for (const id of missing) this.loadingUsers.delete(id);
    }
  }

  getUser(userId: string): U | undefined {
    return this.userCache.get(userId);
  }

  subscribe(cb: (users: Map<string, U>) => void): () => void {
    return this.on("update", cb);
  }
}
