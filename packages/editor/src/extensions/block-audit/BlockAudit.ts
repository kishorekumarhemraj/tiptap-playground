import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { isChangeOrigin } from "@tiptap/extension-collaboration";

/**
 * Per-block audit metadata: who/when created, who/when last modified.
 *
 * Stamped automatically by a transaction-append plugin:
 *   • New nodes get `createdBy` + `createdAt` set on insertion.
 *   • Any change to an existing node's content (text, child nodes,
 *     formatting) refreshes `modifiedBy` + `modifiedAt`.
 *   • Pure attribute updates by this same plugin do NOT recurse.
 *
 * The attributes are added globally to the block types listed in
 * `AUDITED_TYPES` so a section, a paragraph, an editable field, etc.
 * each carry their own provenance.
 *
 * The `userOrigin` flag (set by track-changes for blocks the document
 * author adds) is unrelated and remains the source of truth for
 * "this block was added by the document author".
 */
export interface BlockAuditAttrs {
  createdBy: string | null;     // user id
  createdByName: string | null; // display name (cached for tooltip rendering)
  createdAt: number | null;     // Unix ms
  modifiedBy: string | null;
  modifiedByName: string | null;
  modifiedAt: number | null;
}

export interface BlockAuditOptions {
  user: { id: string; name: string };
  /** Block types that should carry audit metadata. */
  types: string[];
}

const STAMP_META = "blockAudit:stamp";
const blockAuditKey = new PluginKey("blockAudit");

const DEFAULT_TYPES = [
  "section",
  "editableField",
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "bulletList",
  "orderedList",
  "taskList",
];

export const BlockAudit = Extension.create<BlockAuditOptions>({
  name: "blockAudit",

  addOptions() {
    return {
      user: { id: "anonymous", name: "Anonymous" },
      types: DEFAULT_TYPES,
    };
  },

  addGlobalAttributes() {
    const attr = (
      key: keyof BlockAuditAttrs,
      htmlKey: string,
      kind: "string" | "number",
    ) => ({
      default: null as string | number | null,
      parseHTML: (el: HTMLElement) => {
        const raw = el.getAttribute(htmlKey);
        if (raw == null) return null;
        if (kind === "number") {
          const n = Number(raw);
          return Number.isFinite(n) ? n : null;
        }
        return raw || null;
      },
      renderHTML: (attrs: Record<string, unknown>) => {
        const value = attrs[key];
        if (value == null || value === "") return {};
        return { [htmlKey]: String(value) };
      },
    });

    return [
      {
        types: this.options.types,
        attributes: {
          createdBy:       attr("createdBy",       "data-created-by",        "string"),
          createdByName:   attr("createdByName",   "data-created-by-name",   "string"),
          createdAt:       attr("createdAt",       "data-created-at",        "number"),
          modifiedBy:      attr("modifiedBy",      "data-modified-by",       "string"),
          modifiedByName:  attr("modifiedByName",  "data-modified-by-name",  "string"),
          modifiedAt:      attr("modifiedAt",      "data-modified-at",       "number"),
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    const audited = new Set(this.options.types);
    const getUser = () => this.options.user;

    return [
      new Plugin({
        key: blockAuditKey,

        appendTransaction(transactions, _oldState, newState) {
          // Only respond to user-driven doc changes. Skip when our own
          // stamp tx is being applied (avoid infinite recursion) and
          // when nothing in the doc structure changed.
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;
          const isOurOwn = transactions.some((tr) => tr.getMeta(STAMP_META));
          if (isOurOwn) return null;

          // Skip transactions originating from a remote peer via the
          // Y.js sync plugin. Without this guard, every collaborator
          // would re-stamp incoming nodes with their own user id,
          // causing a feedback loop over the wire.
          const isRemote = transactions.some((tr) => isChangeOrigin(tr));
          if (isRemote) return null;

          // Collect the new-doc position ranges that the transactions'
          // step maps actually touched. Any audited node whose own
          // range intersects one of these touched ranges is treated as
          // "modified" this turn. Nodes outside the touched ranges are
          // unaffected and we leave their modifiedAt alone.
          const touched: Array<{ from: number; to: number }> = [];
          for (const tr of transactions) {
            tr.mapping.maps.forEach((stepMap) => {
              stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                touched.push({ from: newStart, to: newEnd });
              });
            });
          }

          const intersectsTouched = (from: number, to: number) =>
            touched.some((r) => r.from <= to && r.to >= from);

          const user = getUser();
          const now = Date.now();
          const tr = newState.tr;
          let changed = false;

          newState.doc.descendants((node: PMNode, pos: number) => {
            if (!audited.has(node.type.name)) return true;

            const attrs = node.attrs as Partial<BlockAuditAttrs>;
            const nodeFrom = pos;
            const nodeTo = pos + node.nodeSize;

            // Case 1: brand-new node (no createdAt yet) → stamp create+modify.
            if (!attrs.createdAt) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                createdBy:      user.id,
                createdByName:  user.name,
                createdAt:      now,
                modifiedBy:     user.id,
                modifiedByName: user.name,
                modifiedAt:     now,
              });
              changed = true;
              return true;
            }

            // Case 2: existing node whose own range was touched by a
            // step → bump modifiedBy/At. We don't recurse into children
            // here because each child gets its own descendants visit.
            if (intersectsTouched(nodeFrom, nodeTo)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                modifiedBy:     user.id,
                modifiedByName: user.name,
                modifiedAt:     now,
              });
              changed = true;
            }
            return true;
          });

          if (!changed) return null;
          tr.setMeta(STAMP_META, true);
          tr.setMeta("addToHistory", false);
          return tr;
        },
      }),
    ];
  },
});

