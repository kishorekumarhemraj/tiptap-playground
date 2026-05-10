import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";
import type { ThreadStore, ThreadData } from "../../drivers/thread-store";
import { CommentMark } from "./mark";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comments: {
      selectThread: (threadId: string | null) => ReturnType;
      startPendingComment: () => ReturnType;
      cancelPendingComment: () => ReturnType;
      createCommentThread: (body: string) => ReturnType;
    };
  }
}

const PLUGIN_KEY = new PluginKey<{ decorations: DecorationSet }>(
  "tpe-comments",
);

function getThreadPositions(doc: Node) {
  const positions = new Map<string, { from: number; to: number }>();
  doc.descendants((node, pos) => {
    for (const mark of node.marks) {
      if (mark.type.name !== "comment") continue;
      const { threadId } = mark.attrs as { threadId: string };
      if (!threadId) continue;
      const from = pos;
      const to = pos + node.nodeSize;
      const current = positions.get(threadId) ?? { from: Infinity, to: 0 };
      positions.set(threadId, {
        from: Math.min(from, current.from),
        to: Math.max(to, current.to),
      });
    }
  });
  return positions;
}

export interface CommentsExtensionOptions {
  threadStore: ThreadStore;
  userId: string;
}

export const CommentsExtension = Extension.create<CommentsExtensionOptions>({
  name: "comments",

  addExtensions() {
    return [CommentMark];
  },

  addStorage() {
    return {
      selectedThreadId: null as string | null,
      pendingComment: false,
      threadPositions: new Map<string, { from: number; to: number }>(),
    };
  },

  addCommands() {
    return {
      selectThread:
        (threadId) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            this.storage.selectedThreadId = threadId;
            this.storage.pendingComment = false;
            tr.setMeta(PLUGIN_KEY, { action: "update" });
            dispatch(tr);
          }
          return true;
        },

      startPendingComment:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            this.storage.selectedThreadId = null;
            this.storage.pendingComment = true;
            tr.setMeta(PLUGIN_KEY, { action: "update" });
            dispatch(tr);
          }
          return true;
        },

      cancelPendingComment:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            this.storage.pendingComment = false;
            tr.setMeta(PLUGIN_KEY, { action: "update" });
            dispatch(tr);
          }
          return true;
        },

      createCommentThread:
        (body) =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;
          const { threadStore } = this.options;
          const { selection } = tr;
          if (selection.empty) return false;

          // Capture the selection range now, before the async call, so the
          // mark is applied to the right range even if focus shifts.
          const { from, to } = selection;

          threadStore
            .createThread({ initialComment: { body } })
            .then((thread) => {
              editor
                .chain()
                .setTextSelection({ from, to })
                .setMark("comment", { threadId: thread.id, orphan: false })
                .run();
              this.storage.selectedThreadId = thread.id;
              this.storage.pendingComment = false;
              editor.view.dispatch(
                editor.state.tr.setMeta(PLUGIN_KEY, { action: "update" }),
              );
            });

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const ext = this;

    return [
      new Plugin({
        key: PLUGIN_KEY,

        state: {
          init: () => ({ decorations: DecorationSet.empty }),
          apply(tr, state) {
            const action = tr.getMeta(PLUGIN_KEY);
            if (!tr.docChanged && !action) return state;

            if (tr.docChanged) {
              ext.storage.threadPositions = getThreadPositions(tr.doc);
            }

            const selected = ext.storage.selectedThreadId;
            if (!selected) return { decorations: DecorationSet.empty };

            const pos = ext.storage.threadPositions.get(selected);
            if (!pos) return { decorations: DecorationSet.empty };

            return {
              decorations: DecorationSet.create(tr.doc, [
                Decoration.inline(pos.from, pos.to, {
                  class: "tpe-thread-mark-selected",
                }),
              ]),
            };
          },
        },

        props: {
          decorations(state) {
            return (
              PLUGIN_KEY.getState(state)?.decorations ?? DecorationSet.empty
            );
          },

          handleClick(view, _pos, event) {
            if (event.button !== 0) return false;

            const target = event.target as HTMLElement | null;
            const mark = target?.closest(".tpe-thread-mark");
            if (!mark) {
              if (ext.storage.selectedThreadId !== null) {
                ext.storage.selectedThreadId = null;
                view.dispatch(
                  view.state.tr.setMeta(PLUGIN_KEY, { action: "update" }),
                );
              }
              return false;
            }

            const threadId = mark.getAttribute("data-tpe-thread-id");
            if (threadId && threadId !== ext.storage.selectedThreadId) {
              ext.storage.selectedThreadId = threadId;
              view.dispatch(
                view.state.tr.setMeta(PLUGIN_KEY, { action: "update" }),
              );
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

/**
 * Sync orphan state of comment marks with the current thread store contents.
 * Call this whenever the thread store emits an update.
 */
export function syncOrphanMarks(
  editor: { view: { state: any; dispatch: (tr: any) => void } },
  threads: Map<string, ThreadData>,
) {
  const { state } = editor.view;
  const tr = state.tr;
  let changed = false;

  state.doc.descendants((node: Node, pos: number) => {
    for (const mark of node.marks) {
      if (mark.type.name !== "comment") continue;
      const { threadId } = mark.attrs as { threadId: string; orphan: boolean };
      const thread = threads.get(threadId);
      const shouldBeOrphan = !thread || thread.resolved || !!thread.deletedAt;
      if (shouldBeOrphan !== mark.attrs.orphan) {
        const from = Math.max(pos, 0);
        const to = Math.min(pos + node.nodeSize, tr.doc.content.size - 1);
        tr.removeMark(from, to, mark);
        tr.addMark(
          from,
          to,
          mark.type.create({ ...mark.attrs, orphan: shouldBeOrphan }),
        );
        changed = true;
      }
    }
  });

  if (changed) editor.view.dispatch(tr);
}
