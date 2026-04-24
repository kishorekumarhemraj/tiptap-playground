import type {
  EditorExtensionContext,
  EditorExtensionModule,
} from "../../core/types";
import { Insertion, Deletion } from "./marks";
import { TrackChanges } from "./trackChanges";
import { TrackChangesOverlay } from "./TrackChangesOverlay";

export interface TrackChangesFeatureConfig {
  defaultActive?: boolean;
}

function getConfig(features: Record<string, unknown>): TrackChangesFeatureConfig {
  const raw = features.trackChanges;
  if (!raw || typeof raw !== "object") return {};
  return raw as TrackChangesFeatureConfig;
}

function policyContextFromCtx(ctx: EditorExtensionContext) {
  return () => ({
    user: ctx.user,
    documentId: ctx.documentId,
    claims: ctx.claims,
    mode: ctx.mode,
  });
}

export const trackChangesModule: EditorExtensionModule = {
  id: "track-changes",
  name: "Track changes",
  description:
    "Insertion/deletion marks with individual & bulk accept/reject, smart deletion, and role-based gating.",
  tiptap: (ctx) => {
    const cfg = getConfig(ctx.features);
    return [
      Insertion,
      Deletion,
      TrackChangesOverlay,
      TrackChanges.configure({
        defaultActive: cfg.defaultActive ?? false,
        author: {
          id: ctx.user.id,
          name: ctx.user.name,
          roles: ctx.user.roles,
        },
        policy: ctx.policy,
        getPolicyContext: policyContextFromCtx(ctx),
        events: ctx.events,
        audit: ctx.drivers.auditLog,
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
      label: "✓ Accept all",
      title: "Accept all tracked changes",
      onRun: (editor) => editor.chain().focus().acceptAllChanges().run(),
    },
    {
      kind: "button",
      id: "rejectAll",
      label: "✕ Reject all",
      title: "Reject all tracked changes",
      onRun: (editor) => editor.chain().focus().rejectAllChanges().run(),
    },
  ],
};

export * from "./marks";
export * from "./trackChanges";
export * from "./TrackChangesOverlay";
