type Listener<T> = (data: T) => void;

export class EventEmitter<Events extends Record<string, any>> {
  private listeners = new Map<keyof Events, Set<Listener<any>>>();

  protected emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const fn of set) fn(data);
    }
  }

  protected on<K extends keyof Events>(
    event: K,
    cb: Listener<Events[K]>,
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(cb);
    return () => set!.delete(cb);
  }
}
