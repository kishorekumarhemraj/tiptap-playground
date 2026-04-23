import type { EditorUser } from "../core/policy";

/**
 * A single entry in the audit log. Designed to be append-only and
 * self-contained so exports (e.g. for 21 CFR Part 11 review) don't
 * need to join against other tables.
 */
export interface AuditEvent {
  /** Stable event key - match this against `EditorEventName` when possible. */
  type: string;
  at: number;
  actor: Pick<EditorUser, "id" | "name"> & { roles?: string[] };
  documentId: string;
  /** Human-readable summary. */
  summary?: string;
  /** Structured payload describing the change. */
  payload?: unknown;
  /** Optional proof of e-signature associated with the action. */
  signature?: {
    signerId: string;
    signerName: string;
    at: number;
    reason: string;
    method: string;
    proof: string;
  };
}

export interface AuditLog {
  /**
   * Append an event. Implementations should treat this as fire-and-forget
   * but may return a promise the host can await for strong delivery.
   */
  record(event: AuditEvent): Promise<void> | void;
  /** Optional: query recent events. */
  list?(opts?: {
    since?: number;
    type?: string;
    documentId?: string;
  }): Promise<AuditEvent[]> | AuditEvent[];
}

/** In-memory audit log - suitable only for demos / tests. */
export function memoryAuditLog(): AuditLog & { snapshot: () => AuditEvent[] } {
  const events: AuditEvent[] = [];
  return {
    record: (event) => {
      events.push(event);
    },
    list: (opts) => {
      let out = [...events];
      if (opts?.type) out = out.filter((e) => e.type === opts.type);
      if (opts?.documentId)
        out = out.filter((e) => e.documentId === opts.documentId);
      if (typeof opts?.since === "number")
        out = out.filter((e) => e.at >= opts!.since!);
      return out;
    },
    snapshot: () => [...events],
  };
}

/** Writes every event to `console.info` - handy while wiring a host. */
export function consoleAuditLog(): AuditLog {
  return {
    record: (event) => {
      // eslint-disable-next-line no-console
      console.info("[audit]", event);
    },
  };
}
