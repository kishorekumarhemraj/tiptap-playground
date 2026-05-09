import { IconComment } from "../../react/icons";
import type { EditorExtensionModule } from "../../core/types";
import { CommentsExtension, syncOrphanMarks } from "./CommentsExtension";

export const commentsModule: EditorExtensionModule = {
  id: "comments",
  name: "Comments",
  description: "Inline comment threads anchored to text ranges.",

  enabled: (ctx) => !!ctx.drivers.threadStore,

  tiptap: (ctx) => {
    const { threadStore } = ctx.drivers;
    if (!threadStore) return [];

    const ext = CommentsExtension.configure({
      threadStore,
      userId: ctx.user.id,
      userName: ctx.user.name,
    });

    // Patch lifecycle hooks to subscribe to thread store changes and keep
    // orphan marks in sync. We do this via config patching because the
    // EditorExtensionModule API doesn't expose onCreate/onDestroy.
    const origConfig = (ext as any).config ?? {};
    const origOnCreate = origConfig.onCreate?.bind(origConfig);
    const origOnDestroy = origConfig.onDestroy?.bind(origConfig);

    let unsubscribe: (() => void) | null = null;

    (ext as any).config = {
      ...origConfig,
      onCreate(this: { editor: any }) {
        origOnCreate?.call(this);
        unsubscribe = threadStore.subscribe((threads) => {
          syncOrphanMarks(this.editor, threads);
        });
      },
      onDestroy(this: { editor: any }) {
        origOnDestroy?.call(this);
        unsubscribe?.();
      },
    };

    return [ext];
  },

  toolbar: (ctx) => {
    if (!ctx.drivers.threadStore) return [];
    return [
      { kind: "divider", id: "comments-divider" },
      {
        kind: "button",
        id: "addComment",
        label: "Comment",
        title: "Add comment to selection (C)",
        icon: IconComment(),
        isDisabled: (editor) => editor.state.selection.empty,
        onRun: (editor) => editor.commands.startPendingComment(),
      },
    ];
  },
};

export { CommentsExtension, syncOrphanMarks } from "./CommentsExtension";
export { CommentMark } from "./mark";
