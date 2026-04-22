import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { MarkType } from "@tiptap/pm/model";
import type { ChangeAttrs } from "./marks";

export interface TrackChangesAuthor {
  id: string;
  name: string;
}

export interface TrackChangesStorage {
  active: boolean;
  author: TrackChangesAuthor | null;
}

export interface TrackChangesOptions {
  /** Default for the `active` flag at editor boot. */
  defaultActive: boolean;
  /** Author to stamp on every insertion / deletion. */
  author: TrackChangesAuthor | null;
}

declare module "@tiptap/core" {
  interface Storage {
    trackChanges: TrackChangesStorage;
  }
  interface Commands<ReturnType> {
    trackChanges: {
      setTrackChanges: (active: boolean) => ReturnType;
      toggleTrackChanges: () => ReturnType;
      acceptAllChanges: () => ReturnType;
      rejectAllChanges: () => ReturnType;
    };
  }
}

const trackChangesPluginKey = new PluginKey("trackChanges");
/** A meta key set on every transaction we generate so we never re-mark our own work. */
const SUPPRESS_META = "trackChanges:suppress";

interface MarkRange {
  from: number;
  to: number;
}

function collectMarkRanges(
  doc: import("@tiptap/pm/model").Node,
  type: MarkType,
): MarkRange[] {
  const ranges: MarkRange[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const has = node.marks.some((m) => m.type === type);
    if (!has) return;
    const from = pos;
    const to = pos + node.nodeSize;
    const last = ranges[ranges.length - 1];
    if (last && last.to === from) {
      last.to = to;
    } else {
      ranges.push({ from, to });
    }
  });
  return ranges;
}

function buildAttrs(
  storage: TrackChangesStorage,
): ChangeAttrs {
  return {
    author: storage.author?.name ?? null,
    authorId: storage.author?.id ?? null,
    timestamp: Date.now(),
  };
}

/**
 * Track changes extension.
 *
 * When `active` is on:
 *   - Every insertion is wrapped in an `insertion` mark via
 *     `appendTransaction`, which runs after the user's transaction
 *     and adds the mark over whatever positions ended up new.
 *   - Backspace / Delete are intercepted and replaced with a
 *     `deletion` mark + cursor move - so nothing is actually removed
 *     from the document; the text becomes a "proposed deletion".
 *
 * Accept / reject removes the marks (or the underlying text) over
 * the whole document. A future iteration can scope them to a
 * selection or to a specific change run.
 */
export const TrackChanges = Extension.create<
  TrackChangesOptions,
  TrackChangesStorage
>({
  name: "trackChanges",

  addOptions() {
    return {
      defaultActive: false,
      author: null,
    };
  },

  addStorage() {
    return {
      active: this.options.defaultActive,
      author: this.options.author,
    };
  },

  addCommands() {
    return {
      setTrackChanges:
        (active) =>
        ({ editor }) => {
          editor.storage.trackChanges.active = active;
          // Re-render so toolbar reflects the new state.
          editor.view.dispatch(editor.state.tr.setMeta(SUPPRESS_META, true));
          return true;
        },

      toggleTrackChanges:
        () =>
        ({ editor, commands }) =>
          commands.setTrackChanges(!editor.storage.trackChanges.active),

      acceptAllChanges:
        () =>
        ({ state, tr, dispatch }) => {
          const insertionType = state.schema.marks.insertion;
          const deletionType = state.schema.marks.deletion;
          if (!insertionType || !deletionType) return false;

          // Drop deletion-marked text from the bottom up so positions stay valid.
          const deletions = collectMarkRanges(state.doc, deletionType);
          for (let i = deletions.length - 1; i >= 0; i--) {
            const { from, to } = deletions[i];
            tr.delete(tr.mapping.map(from), tr.mapping.map(to));
          }
          tr.removeMark(0, tr.doc.content.size, insertionType);
          tr.setMeta(SUPPRESS_META, true);
          if (dispatch) dispatch(tr);
          return true;
        },

      rejectAllChanges:
        () =>
        ({ state, tr, dispatch }) => {
          const insertionType = state.schema.marks.insertion;
          const deletionType = state.schema.marks.deletion;
          if (!insertionType || !deletionType) return false;

          const insertions = collectMarkRanges(state.doc, insertionType);
          for (let i = insertions.length - 1; i >= 0; i--) {
            const { from, to } = insertions[i];
            tr.delete(tr.mapping.map(from), tr.mapping.map(to));
          }
          tr.removeMark(0, tr.doc.content.size, deletionType);
          tr.setMeta(SUPPRESS_META, true);
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    const handleDelete =
      (direction: "back" | "forward") =>
      () => {
        const editor = this.editor;
        const storage = editor.storage.trackChanges;
        if (!storage.active) return false;

        const { state } = editor;
        const deletionType = state.schema.marks.deletion;
        if (!deletionType) return false;

        let from: number;
        let to: number;
        if (state.selection.empty) {
          if (direction === "back") {
            if (state.selection.from <= 1) return false;
            from = state.selection.from - 1;
            to = state.selection.from;
          } else {
            if (state.selection.from >= state.doc.content.size - 1) return false;
            from = state.selection.from;
            to = state.selection.from + 1;
          }
        } else {
          from = state.selection.from;
          to = state.selection.to;
        }

        const tr = state.tr;
        tr.addMark(from, to, deletionType.create(buildAttrs(storage)));
        const cursor = direction === "back" ? from : to;
        tr.setSelection(TextSelection.create(tr.doc, cursor));
        tr.setMeta(SUPPRESS_META, true);
        editor.view.dispatch(tr);
        return true;
      };

    return {
      Backspace: handleDelete("back"),
      Delete: handleDelete("forward"),
    };
  },

  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        key: trackChangesPluginKey,
        appendTransaction(transactions, _oldState, newState) {
          const storage = ext.editor?.storage.trackChanges;
          if (!storage?.active) return null;

          // Skip transactions we (or our commands) initiated.
          const interesting = transactions.filter(
            (tr) => tr.docChanged && !tr.getMeta(SUPPRESS_META),
          );
          if (interesting.length === 0) return null;

          const insertionType = newState.schema.marks.insertion;
          if (!insertionType) return null;

          const newTr = newState.tr;
          const attrs = buildAttrs(storage);
          let modified = false;

          for (const tr of interesting) {
            tr.steps.forEach((step, idx) => {
              const map = step.getMap();
              map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                if (newEnd <= newStart) return;
                // Map through the rest of this transaction's steps so
                // we land on positions that exist in `newState`.
                const remaining = tr.mapping.slice(idx + 1);
                const from = remaining.map(newStart, 1);
                const to = remaining.map(newEnd, -1);
                if (to <= from) return;
                newTr.addMark(from, to, insertionType.create(attrs));
                modified = true;
              });
            });
          }

          if (!modified) return null;
          newTr.setMeta(SUPPRESS_META, true);
          newTr.setMeta("addToHistory", false);
          return newTr;
        },
      }),
    ];
  },
});
