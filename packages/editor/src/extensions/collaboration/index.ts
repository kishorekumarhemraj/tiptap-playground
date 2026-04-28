import type { AnyExtension } from "@tiptap/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import type { EditorExtensionModule } from "../../core/types";
import type {
  CollaborationProvider,
  CollaborationProviderFactory,
} from "../../drivers/collaboration-provider";

// Session cache keyed by documentId. Providers are created once per
// document and reused regardless of factory reference identity. This
// prevents context rebuilds (e.g. mode/readOnly toggle) from tearing
// down and recreating the Y.Doc, which would reconnect all peers and
// lose in-flight CRDT state.
//
// If the host genuinely needs to swap the transport for the same
// documentId (unusual), call provider.destroy() externally first.
const sessions = new Map<string, CollaborationProvider>();

function resolveProvider(
  factory: CollaborationProviderFactory,
  documentId: string,
): CollaborationProvider | null {
  const cached = sessions.get(documentId);
  if (cached) return cached;
  const provider = factory({ documentId });
  if (provider) sessions.set(documentId, provider);
  return provider;
}

/**
 * Collaboration module.
 *
 * The actual transport (websocket / hocuspocus / TipTap cloud) is
 * host-supplied via `ctx.drivers.collaboration`. The module stays
 * framework-agnostic: it just binds `@tiptap/extension-collaboration`
 * to the host-provided Y.Doc and, when an awareness provider is
 * available, layers `@tiptap/extension-collaboration-caret` on top.
 */
export const collaborationModule: EditorExtensionModule = {
  id: "collaboration",
  name: "Collaborative editing",
  description:
    "Binds @tiptap/extension-collaboration to a host-supplied CollaborationProvider (Yjs-based).",
  enabled: (ctx) => !!ctx.drivers.collaboration,
  tiptap: (ctx) => {
    const factory = ctx.drivers.collaboration;
    if (!factory) return [];
    const provider = resolveProvider(factory, ctx.documentId);
    if (!provider) return [];

    const exts: AnyExtension[] = [
      Collaboration.configure({ document: provider.ydoc }),
    ];

    if (provider.awarenessProvider) {
      exts.push(
        CollaborationCaret.configure({
          provider: provider.awarenessProvider,
          user: {
            name: ctx.user.name,
            color: ctx.user.color,
            id: ctx.user.id,
          },
        }),
      );
    }

    return exts;
  },
};
