import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FieldView } from "./FieldView";
import { generateNodeId } from "../../core/ids";
import type { EditorMode } from "../../core/types";
import type { FieldRegistry } from "../../drivers/field-registry";
import type { PermissionPolicy, PolicyContext } from "../../core/policy";
import type { EditorEventBus } from "../../core/events";
import type { AuditLog } from "../../drivers/audit-log";

export interface FieldAttrs {
  /** Stable per-instance id (one node = one id). */
  id: string;
  /**
   * Reference to the host's `FieldDefinition.id` in the
   * `FieldRegistry` driver. Multiple nodes may share the same
   * `fieldId` (e.g. two date fields driven by the same definition).
   */
  fieldId: string;
  /**
   * Current value. Shape depends on the field kind — string for
   * `select`, number for `number`, ISO string for `date`, etc. The
   * library doesn't enforce a shape; the host validates.
   */
  value: unknown;
}

export interface FieldExtensionOptions {
  editorMode?: EditorMode;
  registry?: FieldRegistry;
  policy?: PermissionPolicy;
  getPolicyContext?: () => PolicyContext;
  events?: EditorEventBus;
  audit?: AuditLog;
}

export interface FieldExtensionStorage {
  editorMode: EditorMode;
  registry?: FieldRegistry;
  policy?: PermissionPolicy;
  getPolicyContext?: () => PolicyContext;
  events?: EditorEventBus;
  audit?: AuditLog;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    field: {
      /** Insert a `field` node at the current selection. */
      insertField: (
        attrs: Partial<FieldAttrs> & { fieldId: string },
      ) => ReturnType;
      /** Update the value of the field at the current selection. */
      setFieldValue: (value: unknown) => ReturnType;
    };
  }
  interface Storage {
    field: FieldExtensionStorage;
  }
}

/**
 * Inline atomic node that embeds a host-rendered form control
 * (select, date picker, currency input, …) inside the document.
 *
 * The node carries only routing state — `id`, `fieldId`, `value`.
 * All metadata (label, options/LOVs, validation rules) lives on the
 * host's `FieldDefinition` and is fetched at render time via the
 * `FieldRegistry` driver. Drag/select are off — the user interacts
 * with the embedded control, not with the node frame.
 */
export const Field = Node.create<FieldExtensionOptions, FieldExtensionStorage>({
  name: "field",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return {};
  },

  addStorage(): FieldExtensionStorage {
    return {
      editorMode: this.options.editorMode ?? "document",
      registry: this.options.registry,
      policy: this.options.policy,
      getPolicyContext: this.options.getPolicyContext,
      events: this.options.events,
      audit: this.options.audit,
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(FieldView);
  },

  addAttributes() {
    return {
      id: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-id"),
        renderHTML: (attrs) => (attrs.id ? { "data-id": attrs.id } : {}),
      },
      fieldId: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-field-id"),
        renderHTML: (attrs) =>
          attrs.fieldId ? { "data-field-id": attrs.fieldId } : {},
      },
      value: {
        default: null as unknown,
        parseHTML: (el) => {
          const raw = el.getAttribute("data-value");
          if (raw === null) return null;
          try {
            return JSON.parse(raw);
          } catch {
            return raw;
          }
        },
        renderHTML: (attrs) =>
          attrs.value === null || attrs.value === undefined
            ? {}
            : { "data-value": JSON.stringify(attrs.value) },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-type='field']" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const fallback = node.attrs.fieldId
      ? `[${node.attrs.fieldId}]`
      : "[field]";
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "field" }),
      fallback,
    ];
  },

  addCommands() {
    return {
      insertField:
        (attrs) =>
        ({ commands }) => {
          const target: FieldAttrs = {
            id: generateNodeId("fld"),
            value: null,
            ...attrs,
          };
          return commands.insertContent({
            type: this.name,
            attrs: target,
          });
        },

      setFieldValue:
        (value) =>
        ({ commands, state }) => {
          const node = state.selection.$from.nodeAfter;
          if (!node || node.type.name !== this.name) return false;
          return commands.updateAttributes(this.name, { value });
        },
    };
  },
});
