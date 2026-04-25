import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { MarkType } from "@tiptap/pm/model";
import type { ChangeAttrs } from "./marks";
import type {
  PermissionPolicy,
  PolicyContext,
} from "../../core/policy";
import type { EditorEventBus } from "../../core/events";
import type { AuditLog } from "../../drivers/audit-log";

export interface TrackChangesAuthor {
  id: string;
  name: string;
  /** Optional role list, e.g. ["author"], ["contributor"], ["reviewer"] */
  roles?: string[];
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
  policy?: PermissionPolicy;
  getPolicyContext?: () => PolicyContext;
  events?: EditorEventBus;
  audit?: AuditLog;
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
      /** Accept a single tracked change by its changeId. */
      acceptChange: (changeId: string) => ReturnType;
      /** Reject a single tracked change by its changeId. */
      rejectChange: (changeId: string) => ReturnType;
    };
  }
}

const trackChangesPluginKey = new PluginKey("trackChanges");
/** A meta key set on every transaction we generate so we never re-mark our own work. */
const SUPPRESS_META = "trackChanges:suppress";

interface MarkRange {
  from: number;
  to: number;
  attrs?: Record<string, unknown>;
}

function collectMarkRanges(
  doc: import("@tiptap/pm/model").Node,
  type: MarkType,
  filterChangeId?: string,
): MarkRange[] {
  const ranges: MarkRange[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const mark = node.marks.find((m) => m.type === type);
    if (!mark) return;
    if (filterChangeId && mark.attrs.changeId !== filterChangeId) return;
    const from = pos;
    const to = pos + node.nodeSize;
    const last = ranges[ranges.length - 1];
    // Merge only if same changeId
    if (
      last &&
      last.to === from &&
      last.attrs?.changeId === mark.attrs.changeId
    ) {
      last.to = to;
    } else {
      ranges.push({ from, to, attrs: mark.attrs });
    }
  });
  return ranges;
}

/** Generate a short collision-resistant ID for a change run. */
function newChangeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function buildAttrs(
  storage: TrackChangesStorage,
  changeId?: string,
): ChangeAttrs {
  return {
    author: storage.author?.name ?? null,
    authorId: storage.author?.id ?? null,
    timestamp: Date.now(),
    changeId: changeId ?? newChangeId(),
  };
}

/**
 * Check whether the current user is allowed to accept/reject a change
 * made by `changeAuthorId`.
 *
 * Rules:
 *  - Authors (role "author") can accept/reject anyone's changes.
 *  - Contributors / reviewers can only accept/reject their own.
 *  - If no roles are defined, fall back to permissive (anyone can act).
 */
function canActOnChange(
  actor: TrackChangesAuthor | null,
  changeAuthorId: string | null,
): boolean {
  if (!actor) return false;
  const roles = actor.roles ?? [];
  if (roles.length === 0) return true; // no roles configured → permissive
  if (roles.includes("author")) return true; // authors act on anyone
  // contributors / reviewers may only act on their own changes
  return actor.id === changeAuthorId;
}

/**
 * Track changes extension.
 *
 * When `active` is on:
 *   - Every insertion is wrapped in an `insertion` mark via
 *     `appendTransaction`, which runs after the user's transaction
 *     and adds the mark over whatever positions ended up new.
 *   - Backspace / Delete are intercepted. If the range being deleted is
 *     *entirely covered* by an `insertion` mark belonging to the current
 *     author, the mark (and underlying text) is simply removed — no
 *     deletion tracking needed for reversing your own pending insertion.
 *     Otherwise, the text is hidden behind a `deletion` mark.
 *
 * Accept / reject removes the marks (or the underlying text).
 * Individual accept/reject is scoped by `changeId`.
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
      policy: undefined,
      getPolicyContext: undefined,
      events: undefined,
      audit: undefined,
    };
  },

  addStorage() {
    return {
      active: this.options.defaultActive,
      author: this.options.author,
    };
  },

  addCommands() {
    const options = this.options;

    const denyTo = (action: string, reason?: string) => {
      options.events?.emit("permission.denied", { action, reason });
      return false;
    };

    return {
      setTrackChanges:
        (active) =>
        ({ editor }) => {
          const ctx = options.getPolicyContext?.();
          if (options.policy && ctx) {
            const decision = options.policy.canToggleTrackChanges(ctx);
            if (!decision.allowed) {
              return denyTo("change.tracking.toggle", decision.reason);
            }
          }
          editor.storage.trackChanges.active = active;
          editor.view.dispatch(editor.state.tr.setMeta(SUPPRESS_META, true));
          options.events?.emit("change.tracking.toggled", { active });
          options.audit?.record({
            type: "change.tracking.toggled",
            at: Date.now(),
            actor: { id: "?", name: "?" },
            documentId: "?",
            summary: `Track changes ${active ? "on" : "off"}`,
            payload: { active },
          });
          return true;
        },

      toggleTrackChanges:
        () =>
        ({ editor, commands }) =>
          commands.setTrackChanges(!editor.storage.trackChanges.active),

      acceptAllChanges:
        () =>
        ({ state, tr, dispatch }) => {
          const ctx = options.getPolicyContext?.();
          if (options.policy && ctx) {
            const decision = options.policy.canAcceptChanges(ctx);
            if (!decision.allowed) {
              return denyTo("change.accept", decision.reason);
            }
          }
          const insertionType = state.schema.marks.insertion;
          const deletionType = state.schema.marks.deletion;
          if (!insertionType || !deletionType) return false;

          const deletions = collectMarkRanges(state.doc, deletionType);
          const insertions = collectMarkRanges(state.doc, insertionType);
          for (let i = deletions.length - 1; i >= 0; i--) {
            const { from, to } = deletions[i];
            tr.delete(tr.mapping.map(from), tr.mapping.map(to));
          }
          tr.removeMark(0, tr.doc.content.size, insertionType);
          tr.setMeta(SUPPRESS_META, true);
          if (dispatch) dispatch(tr);
          const count = deletions.length + insertions.length;
          options.events?.emit("change.accepted", { count });
          return true;
        },

      rejectAllChanges:
        () =>
        ({ state, tr, dispatch }) => {
          const ctx = options.getPolicyContext?.();
          if (options.policy && ctx) {
            const decision = options.policy.canRejectChanges(ctx);
            if (!decision.allowed) {
              return denyTo("change.reject", decision.reason);
            }
          }
          const insertionType = state.schema.marks.insertion;
          const deletionType = state.schema.marks.deletion;
          if (!insertionType || !deletionType) return false;

          const insertions = collectMarkRanges(state.doc, insertionType);
          const deletions = collectMarkRanges(state.doc, deletionType);
          for (let i = insertions.length - 1; i >= 0; i--) {
            const { from, to } = insertions[i];
            tr.delete(tr.mapping.map(from), tr.mapping.map(to));
          }
          tr.removeMark(0, tr.doc.content.size, deletionType);
          tr.setMeta(SUPPRESS_META, true);
          if (dispatch) dispatch(tr);
          const count = insertions.length + deletions.length;
          options.events?.emit("change.rejected", { count });
          return true;
        },

      acceptChange:
        (changeId) =>
        ({ state, tr, dispatch }) => {
          const storage = this.editor?.storage
            .trackChanges as TrackChangesStorage | undefined;
          const insertionType = state.schema.marks.insertion;
          const deletionType = state.schema.marks.deletion;
          if (!insertionType || !deletionType) return false;

          // Role check: find the change author from the mark
          const allRanges = [
            ...collectMarkRanges(state.doc, insertionType, changeId),
            ...collectMarkRanges(state.doc, deletionType, changeId),
          ];
          if (allRanges.length === 0) return false;

          const changeAuthorId = allRanges[0].attrs?.authorId as
            | string
            | null;
          if (!canActOnChange(storage?.author ?? null, changeAuthorId)) {
            options.events?.emit("permission.denied", {
              action: "change.accept",
              reason:
                "Only the author can accept/reject other contributors' changes",
            });
            return false;
          }

          // Accept: keep insertions (remove mark), delete deletions
          const deletions = collectMarkRanges(state.doc, deletionType, changeId);
          const insertions = collectMarkRanges(
            state.doc,
            insertionType,
            changeId,
          );
          for (let i = deletions.length - 1; i >= 0; i--) {
            tr.delete(
              tr.mapping.map(deletions[i].from),
              tr.mapping.map(deletions[i].to),
            );
          }
          for (const { from, to } of insertions) {
            tr.removeMark(
              tr.mapping.map(from),
              tr.mapping.map(to),
              insertionType,
            );
          }
          tr.setMeta(SUPPRESS_META, true);
          if (dispatch) dispatch(tr);
          options.events?.emit("change.accepted", { changeId, count: 1 });
          return true;
        },

      rejectChange:
        (changeId) =>
        ({ state, tr, dispatch }) => {
          const storage = this.editor?.storage
            .trackChanges as TrackChangesStorage | undefined;
          const insertionType = state.schema.marks.insertion;
          const deletionType = state.schema.marks.deletion;
          if (!insertionType || !deletionType) return false;

          const allRanges = [
            ...collectMarkRanges(state.doc, insertionType, changeId),
            ...collectMarkRanges(state.doc, deletionType, changeId),
          ];
          if (allRanges.length === 0) return false;

          const changeAuthorId = allRanges[0].attrs?.authorId as
            | string
            | null;
          if (!canActOnChange(storage?.author ?? null, changeAuthorId)) {
            options.events?.emit("permission.denied", {
              action: "change.reject",
              reason:
                "Only the author can accept/reject other contributors' changes",
            });
            return false;
          }

          // Reject: delete insertions, restore deletions (remove mark)
          const insertions = collectMarkRanges(
            state.doc,
            insertionType,
            changeId,
          );
          const deletions = collectMarkRanges(state.doc, deletionType, changeId);
          for (let i = insertions.length - 1; i >= 0; i--) {
            tr.delete(
              tr.mapping.map(insertions[i].from),
              tr.mapping.map(insertions[i].to),
            );
          }
          for (const { from, to } of deletions) {
            tr.removeMark(
              tr.mapping.map(from),
              tr.mapping.map(to),
              deletionType,
            );
          }
          tr.setMeta(SUPPRESS_META, true);
          if (dispatch) dispatch(tr);
          options.events?.emit("change.rejected", { changeId, count: 1 });
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    const handleDelete =
      (direction: "back" | "forward") =>
      () => {
        const editor = this.editor;
        const storage = editor.storage.trackChanges as TrackChangesStorage;
        if (!storage.active) return false;

        const { state } = editor;
        const deletionType = state.schema.marks.deletion;
        const insertionType = state.schema.marks.insertion;
        if (!deletionType || !insertionType) return false;

        let from: number;
        let to: number;
        if (state.selection.empty) {
          if (direction === "back") {
            if (state.selection.from <= 1) return false;
            from = state.selection.from - 1;
            to = state.selection.from;
          } else {
            if (state.selection.from >= state.doc.content.size - 1)
              return false;
            from = state.selection.from;
            to = state.selection.from + 1;
          }
        } else {
          from = state.selection.from;
          to = state.selection.to;
        }

        const tr = state.tr;

        // ── Smart deletion ────────────────────────────────────────────────
        // If the entire range-to-delete is covered by insertion marks that
        // belong to the *current author*, just remove those marks and the
        // underlying text (undo the pending insertion) instead of layering
        // a deletion mark on top.
        const $from = state.doc.resolve(from);
        const $to = state.doc.resolve(to);
        let entirelyOwnInsertion = true;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!node.isText) return;
          const insMark = node.marks.find((m) => m.type === insertionType);
          if (!insMark || insMark.attrs.authorId !== storage.author?.id) {
            entirelyOwnInsertion = false;
          }
        });

        if (entirelyOwnInsertion && from < to) {
          tr.delete(from, to);
          tr.setMeta(SUPPRESS_META, true);
          editor.view.dispatch(tr);
          return true;
        }

        // ── Standard tracked deletion ─────────────────────────────────────
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
    // Stable changeId for the current continuous insertion burst.
    // Resets whenever tracking is toggled or a non-insertion transaction
    // interrupts the flow.
    let currentInsertionChangeId: string | null = null;

    return [
      new Plugin({
        key: trackChangesPluginKey,
        appendTransaction(transactions, _oldState, newState) {
          const storage = ext.editor?.storage
            .trackChanges as TrackChangesStorage | undefined;
          if (!storage?.active) {
            currentInsertionChangeId = null;
            return null;
          }

          // Skip transactions we (or our commands) initiated.
          const interesting = transactions.filter(
            (tr) => tr.docChanged && !tr.getMeta(SUPPRESS_META),
          );
          if (interesting.length === 0) return null;

          const insertionType = newState.schema.marks.insertion;
          if (!insertionType) return null;

          // Reuse the same changeId for a burst of keystrokes so they
          // form one logical "change run" that can be accepted/rejected
          // as a unit. A new changeId is minted when the author pauses
          // or a non-text transaction occurs.
          if (!currentInsertionChangeId) {
            currentInsertionChangeId = newChangeId();
          }

          const newTr = newState.tr;
          const attrs = buildAttrs(storage, currentInsertionChangeId);
          let modified = false;

          for (const tr of interesting) {
            tr.steps.forEach((step, idx) => {
              const map = step.getMap();
              map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                if (newEnd <= newStart) return;
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
