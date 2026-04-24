import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { TrackChangesStorage } from "./trackChanges";

const STYLE_TAG_ID = "tpe-track-changes-style";
const STYLE_RULES = `
.tpe-tc-banner {
  position: fixed;
  z-index: 90;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 10px;
  background: var(--accent-bg, #fff4d6);
  border: 1px solid var(--accent-border, #e9c465);
  border-radius: 999px;
  color: var(--fg, #1f1f1c);
  font-size: 12px;
  font-weight: 500;
  box-shadow: var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.08));
  pointer-events: none;
}
.tpe-tc-banner[hidden] { display: none; }
.tpe-tc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent, #d48a0a);
  box-shadow: 0 0 0 3px rgba(212, 138, 10, 0.22);
  animation: tpe-tc-pulse 1.6s ease-in-out infinite;
}
@keyframes tpe-tc-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(212, 138, 10, 0.22); }
  50%      { box-shadow: 0 0 0 7px rgba(212, 138, 10, 0.04); }
}
.tpe-tc-banner-label { letter-spacing: 0.01em; }
.tpe-tc-banner-author { color: var(--fg-muted, #6b6b68); font-weight: 400; }

.tpe-tc-tooltip {
  position: absolute;
  z-index: 60;
  display: none;
  max-width: 260px;
  padding: 8px 10px;
  background: var(--fg, #1f1f1c);
  color: var(--bg, #fff);
  border-radius: 6px;
  box-shadow: var(--shadow-md, 0 8px 24px rgba(0,0,0,0.16));
  font-size: 12px;
  line-height: 1.4;
  pointer-events: none;
}
.tpe-tc-tooltip[data-visible="true"] { display: block; }
.tpe-tc-tooltip-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  margin-bottom: 2px;
}
.tpe-tc-tooltip-kind {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.tpe-tc-tooltip-kind[data-kind="insert"] { background: rgba(88, 194, 121, 0.25); color: #7ee8a4; }
.tpe-tc-tooltip-kind[data-kind="delete"] { background: rgba(244, 114, 114, 0.25); color: #ffb0b0; }
.tpe-tc-tooltip-meta { color: rgba(255,255,255,0.7); }
`;

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = STYLE_RULES;
  document.head.appendChild(style);
}

const bannerPluginKey = new PluginKey("trackChangesBanner");
const tooltipPluginKey = new PluginKey("trackChangesTooltip");

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) {
    const m = Math.round(diff / 60_000);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (diff < 86_400_000) {
    const h = Math.round(diff / 3_600_000);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.round(diff / 86_400_000);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function formatAbsolute(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

/**
 * Surface-level UI for track-changes. Two small plugins:
 *   - a floating banner pinned to the top-right of the editor
 *     whenever `editor.storage.trackChanges.active` is true, so the
 *     author can't miss that edits are being recorded;
 *   - a hover tooltip on `<ins data-track-change>` / `<del>` runs
 *     showing who made the change and when.
 *
 * Rendering is kept out of React on purpose - the track-changes
 * story is editor-internal, and tying it to the host component tree
 * would make it harder to reuse in diff views or preview renderers.
 */
export const TrackChangesOverlay = Extension.create({
  name: "trackChangesOverlay",

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [bannerPlugin(editor), tooltipPlugin()];
  },
});

function bannerPlugin(editor: Editor): Plugin {
  return new Plugin({
    key: bannerPluginKey,
    view(view) {
      ensureStyles();
      const banner = document.createElement("div");
      banner.className = "tpe-tc-banner";
      banner.hidden = true;
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
      banner.innerHTML = `
<span class="tpe-tc-dot" aria-hidden="true"></span>
<span class="tpe-tc-banner-label">Track changes on</span>
<span class="tpe-tc-banner-author"></span>`;

      // Append to body so the fixed banner is never clipped by a
      // flex container or overflow:auto ancestor.
      document.body.appendChild(banner);

      const render = () => {
        const storage = editor.storage.trackChanges as
          | TrackChangesStorage
          | undefined;
        const active = !!storage?.active;
        banner.hidden = !active;
        const authorEl = banner.querySelector<HTMLSpanElement>(
          ".tpe-tc-banner-author",
        );
        if (authorEl) {
          authorEl.textContent = storage?.author
            ? `· ${storage.author.name}`
            : "";
        }
        if (active) {
          // Pin banner 12px below + inside the top-right of the editor.
          const r = view.dom.getBoundingClientRect();
          banner.style.top = `${r.top + 12}px`;
          banner.style.right = `${window.innerWidth - r.right + 12}px`;
        }
      };

      // Storage flips don't always coincide with a PM transaction
      // (toggle reads/writes the storage object directly), so we
      // subscribe to TipTap's transaction event AND poll gently.
      const onTx = () => render();
      editor.on("transaction", onTx);
      const interval = window.setInterval(render, 400);
      render();

      return {
        update: render,
        destroy() {
          editor.off("transaction", onTx);
          window.clearInterval(interval);
          banner.remove();
        },
      };
    },
  });
}

function tooltipPlugin(): Plugin {
  return new Plugin({
    key: tooltipPluginKey,
    view(view) {
      ensureStyles();
      const tip = document.createElement("div");
      tip.className = "tpe-tc-tooltip";
      tip.setAttribute("data-visible", "false");
      document.body.appendChild(tip);

      let currentEl: HTMLElement | null = null;

      const show = (el: HTMLElement) => {
        const kindRaw = el.getAttribute("data-track-change");
        const kind = kindRaw === "delete" ? "delete" : "insert";
        const author = el.getAttribute("data-author") ?? "Unknown";
        const tsAttr = el.getAttribute("data-timestamp");
        const ts = tsAttr ? Number(tsAttr) : NaN;
        const kindLabel = kind === "insert" ? "Inserted" : "Deleted";
        const metaParts: string[] = [];
        if (Number.isFinite(ts)) {
          metaParts.push(formatRelative(ts));
          metaParts.push(formatAbsolute(ts));
        }
        tip.innerHTML = `
<div class="tpe-tc-tooltip-head">
  <span class="tpe-tc-tooltip-kind" data-kind="${kind}">${kindLabel}</span>
  <span>${escapeHtml(author)}</span>
</div>
${metaParts.length ? `<div class="tpe-tc-tooltip-meta">${escapeHtml(metaParts.join(" · "))}</div>` : ""}`;

        const rect = el.getBoundingClientRect();
        const top = rect.bottom + window.scrollY + 6;
        const left = rect.left + window.scrollX;
        tip.style.top = `${top}px`;
        tip.style.left = `${left}px`;
        tip.setAttribute("data-visible", "true");
      };

      const hide = () => {
        tip.setAttribute("data-visible", "false");
        currentEl = null;
      };

      const onOver = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        const el = target?.closest<HTMLElement>(
          "ins[data-track-change], del[data-track-change]",
        );
        if (!el) {
          if (currentEl) hide();
          return;
        }
        if (el === currentEl) return;
        currentEl = el;
        show(el);
      };

      const onLeave = () => hide();

      view.dom.addEventListener("mouseover", onOver);
      view.dom.addEventListener("mouseleave", onLeave);

      return {
        destroy() {
          view.dom.removeEventListener("mouseover", onOver);
          view.dom.removeEventListener("mouseleave", onLeave);
          tip.remove();
        },
      };
    },
  });
}
