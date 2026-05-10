import type { AnyExtension } from "@tiptap/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import { CollaborationMigration } from "./migration";
import type { EditorExtensionModule } from "../../core/types";
import type {
  CollaborationProvider,
  CollaborationProviderFactory,
} from "../../drivers/collaboration-provider";

/* ─── Remote-caret styles ──────────────────────────────────────────────────
 * The caret is a thin coloured bar with a floating name label.
 * The label fades out a few seconds after the remote user stops moving —
 * implemented by re-applying a fresh CSS animation on every awareness
 * change (TipTap rebuilds the decoration on each keystroke from a remote
 * user). On hover the label is always visible.
 */
const CARET_STYLE_ID = "tpe-collab-caret-style";
const CARET_STYLE_RULES = `
.tpe-collab-caret {
  position: relative;
  border-left: 2px solid var(--tpe-caret-color, #2563eb);
  margin-left: -1px;
  margin-right: -1px;
  height: 1.1em;
  word-break: normal;
  pointer-events: none;
  box-sizing: border-box;
}
.tpe-collab-caret-label {
  position: absolute;
  left: -2px;
  top: -1.45em;
  white-space: nowrap;
  background: var(--tpe-caret-color, #2563eb);
  color: var(--tpe-caret-text-color, #fff);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  padding: 3px 6px;
  border-radius: 4px 4px 4px 0;
  user-select: none;
  pointer-events: none;
  font-family: var(--font-sans, system-ui, sans-serif);
  letter-spacing: 0.01em;
  animation: tpe-caret-label-fade 3.5s ease-out forwards;
}
@keyframes tpe-caret-label-fade {
  0%, 70%   { opacity: 1; transform: translateY(0); }
  100%      { opacity: 0; transform: translateY(-2px); }
}
.tpe-collab-caret:hover .tpe-collab-caret-label,
.tpe-collab-caret:focus .tpe-collab-caret-label {
  animation: none;
  opacity: 1;
}
.tpe-collab-selection {
  background-color: var(--tpe-caret-color, #2563eb);
  opacity: 0.18;
}
`;

function attachCaretStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(CARET_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = CARET_STYLE_ID;
  el.textContent = CARET_STYLE_RULES;
  document.head.appendChild(el);
}

/**
 * Returns true when `bgColor` is dark enough that white text reads well
 * over it. Ported from blocknotes/YCursorPlugin.ts.
 * Inspired by https://stackoverflow.com/a/3943023
 */
function isDarkColor(bgColor: string): boolean {
  const hex =
    bgColor.charAt(0) === "#" ? bgColor.substring(1, 7) : bgColor;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const linearise = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
  return L <= 0.179;
}

function renderRemoteCaret(user: Record<string, unknown>): HTMLElement {
  const color = (user.color as string | undefined) ?? "#2563eb";
  const name = (user.name as string | undefined) ?? "Anonymous";
  const textColor = isDarkColor(color) ? "#fff" : "#000";

  const caret = document.createElement("span");
  caret.className = "tpe-collab-caret";
  caret.style.setProperty("--tpe-caret-color", color);
  caret.style.setProperty("--tpe-caret-text-color", textColor);

  const label = document.createElement("span");
  label.className = "tpe-collab-caret-label";
  label.textContent = name;
  caret.appendChild(label);
  return caret;
}

function renderRemoteSelection(user: Record<string, unknown>) {
  const color = (user.color as string | undefined) ?? "#2563eb";
  return {
    nodeName: "span",
    class: "tpe-collab-selection",
    style: `--tpe-caret-color: ${color};`,
    "data-user": (user.name as string | undefined) ?? "Anonymous",
  };
}

// Session cache keyed by documentId. Providers are created once per
// document and reused regardless of factory reference identity. This
// prevents context rebuilds (mode/readOnly toggle) from tearing down
// and recreating the Y.Doc, which would reconnect all peers and lose
// in-flight CRDT state.
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
 * framework-agnostic: it binds `@tiptap/extension-collaboration` to the
 * host-provided Y.Doc and, when an awareness provider is available, layers
 * `@tiptap/extension-collaboration-caret` on top with smart dark/light
 * label text (ported from blocknotes/YCursorPlugin).
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
      CollaborationMigration.configure({
        fragment: provider.ydoc.getXmlFragment("default"),
        rules: [], // Add migration rules here in the future
      }),
    ];

    if (provider.awarenessProvider) {
      attachCaretStyles();
      exts.push(
        CollaborationCaret.configure({
          provider: provider.awarenessProvider,
          user: {
            name: ctx.user.name,
            color: ctx.user.color,
            id: ctx.user.id,
          },
          render: renderRemoteCaret,
          selectionRender: renderRemoteSelection,
        }),
      );
    }

    return exts;
  },
};
