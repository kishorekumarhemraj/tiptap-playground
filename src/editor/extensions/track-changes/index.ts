import type { EditorExtensionModule } from "../../types";
import { Insertion, Deletion } from "./marks";
import { TrackChanges } from "./trackChanges";

export interface TrackChangesFeatureConfig {
  defaultActive?: boolean;
}

function getConfig(features: Record<string, unknown>): TrackChangesFeatureConfig {
  const raw = features.trackChanges;
  if (!raw || typeof raw !== "object") return {};
  return raw as TrackChangesFeatureConfig;
}

export const trackChangesModule: EditorExtensionModule = {
  id: "track-changes",
  name: "Track changes",
  description:
    "Insertion/deletion marks plus an MS-Word-style proposal/accept/reject flow.",
  tiptap: (ctx) => {
    const cfg = getConfig(ctx.features);
    return [
      Insertion,
      Deletion,
      TrackChanges.configure({
        defaultActive: cfg.defaultActive ?? false,
        author: { id: ctx.user.id, name: ctx.user.name },
      }),
    ];
  },
  toolbar: () => [
    {
      kind: "button",
      id: "trackChangesToggle",
      label: "✎ Track",
      title: "Toggle track changes",
      isActive: (editor) => editor.storage.trackChanges?.active === true,
      onRun: (editor) => editor.commands.toggleTrackChanges(),
    },
    {
      kind: "button",
      id: "acceptAll",
      label: "✓ Accept",
      title: "Accept all changes",
      onRun: (editor) => editor.chain().focus().acceptAllChanges().run(),
    },
    {
      kind: "button",
      id: "rejectAll",
      label: "✗ Reject",
      title: "Reject all changes",
      onRun: (editor) => editor.chain().focus().rejectAllChanges().run(),
    },
  ],
};

export * from "./marks";
export * from "./trackChanges";
