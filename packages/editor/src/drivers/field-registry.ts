import type { ReactNode } from "react";

/**
 * Definition of a host-supplied form field. Templates reference these
 * by `id`; the calling application owns the actual field set, the
 * options/LOVs, validation, and rendering.
 *
 * `kind` is host-defined (e.g. "select", "date", "currency") so the
 * library never has to grow an enum to keep up with new control types.
 * The library hands the definition + current value back to the host's
 * `render(...)` function and lets the host produce the React tree.
 */
export interface FieldDefinition {
  /** Stable identifier used by `field.fieldId` to look the def up. */
  id: string;
  /** Host-defined control kind (`"select"`, `"date"`, ...). */
  kind: string;
  /** User-facing label. */
  label: string;
  /** Optional one-line guidance shown alongside the control. */
  instruction?: string;
  /** Whether the field must be filled before the document is finalised. */
  required?: boolean;
  /** List-of-values for selectable kinds. Free-form for everything else. */
  options?: Array<{ value: string; label: string }>;
  /** Arbitrary host-managed metadata (validation rules, ext refs, ...). */
  meta?: Record<string, unknown>;
}

/**
 * Props passed to the host's `render(...)` function. The NodeView
 * supplies these on every render; the host returns whatever React
 * tree implements the control.
 */
export interface FieldRenderProps {
  def: FieldDefinition;
  /** Current value (may be `null` if unfilled). */
  value: unknown;
  /** Composed from editor mode + permission policy. */
  readOnly: boolean;
  /** Commit a new value. Routed through policy + audit by the NodeView. */
  onChange(value: unknown): void;
}

/**
 * Pluggable registry of host-supplied form fields. Templates author
 * `field` nodes referencing definitions by id; documents render the
 * controls via `render(...)`.
 *
 * `render` is optional — when absent, the `FieldView` falls back to
 * a read-only label so templates can still be authored before the
 * host wires its UI.
 */
export interface FieldRegistry {
  get(
    id: string,
  ): FieldDefinition | null | Promise<FieldDefinition | null>;
  list(): FieldDefinition[] | Promise<FieldDefinition[]>;
  /**
   * Optional host-supplied renderer. When absent, the library shows
   * a fallback chip with the field label and value.
   */
  render?(props: FieldRenderProps): ReactNode;
  /**
   * Optional notifier — called when the registry's contents change
   * (e.g. LOVs arrive over HTTP). NodeViews subscribe to rerender.
   */
  subscribe?(listener: () => void): () => void;
}

/**
 * In-memory registry suitable for demos and tests. Exposes mutation
 * helpers (`set`, `remove`) that aren't part of the contract so the
 * playground can update LOVs at runtime.
 */
export interface MemoryFieldRegistry extends FieldRegistry {
  set(def: FieldDefinition): void;
  remove(id: string): void;
}

export function memoryFieldRegistry(
  initial: FieldDefinition[] = [],
  render?: (props: FieldRenderProps) => ReactNode,
): MemoryFieldRegistry {
  const map = new Map<string, FieldDefinition>();
  for (const def of initial) map.set(def.id, def);
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const fn of listeners) fn();
  };
  return {
    get: (id) => map.get(id) ?? null,
    list: () => Array.from(map.values()),
    render,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    set: (def) => {
      map.set(def.id, def);
      notify();
    },
    remove: (id) => {
      map.delete(id);
      notify();
    },
  };
}
