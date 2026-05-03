import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { TrackChangesStorage, TrackChangesAuthor } from "./trackChanges";

const STYLE_TAG_ID = "tpe-track-changes-style";

/** All styles use design tokens from globals.css so they adapt to light/dark. */
const STYLE_RULES = `
/* ─── Active-mode banner ─────────────────────────────────────────────── */
.tpe-tc-banner {
  position: fixed;
  z-index: 90;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 10px;
  background: var(--accent-soft, rgba(37,99,235,0.10));
  border: 1px solid var(--accent, #2563eb);
  border-radius: var(--radius-full, 9999px);
  color: var(--fg, #1a1a1a);
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-sans, sans-serif);
  box-shadow: var(--shadow-md, 0 4px 6px rgba(0,0,0,0.07));
  pointer-events: none;
  transition: opacity var(--transition-normal, 150ms ease);
}
.tpe-tc-banner[hidden] { display: none; }

.tpe-tc-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent, #2563eb);
  animation: tpe-tc-pulse 1.8s ease-in-out infinite;
}
@keyframes tpe-tc-pulse {
  0%, 100% { box-shadow: 0 0 0 2px var(--accent-soft, rgba(37,99,235,0.15)); }
  50%       { box-shadow: 0 0 0 6px transparent; }
}

.tpe-tc-banner-label { letter-spacing: 0.01em; color: var(--accent, #2563eb); }
.tpe-tc-banner-author { color: var(--fg-muted, #6b6b68); font-weight: 400; }

/* ─── Mark colours in the document ──────────────────────────────────── */
ins[data-track-change] {
  text-decoration: underline;
  text-decoration-color: var(--success, #059669);
  text-underline-offset: 2px;
  color: var(--success, #059669);
  background: var(--success-soft, rgba(5,150,105,0.08));
  border-radius: 2px;
  cursor: pointer;
}
del[data-track-change] {
  text-decoration: line-through;
  text-decoration-color: var(--danger, #dc2626);
  color: var(--danger, #dc2626);
  background: var(--danger-soft, rgba(220,38,38,0.08));
  border-radius: 2px;
  cursor: pointer;
}

/* ─── Change popover ─────────────────────────────────────────────────── */
.tpe-tc-popover {
  position: fixed;
  z-index: 200;
  width: 280px;
  padding: 0;
  background: var(--bg, #ffffff);
  border: 1px solid var(--border, #e8e8e5);
  border-radius: var(--radius-lg, 8px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
  font-family: var(--font-sans, sans-serif);
  font-size: 13px;
  color: var(--fg, #1a1a1a);
  overflow: hidden;
  pointer-events: auto;
  transition: opacity 120ms ease, transform 120ms ease;
}
.tpe-tc-popover[data-visible="false"] {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
  pointer-events: none;
}
.tpe-tc-popover[data-visible="true"] {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Header row: kind badge + timestamp on the right */
.tpe-tc-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px 8px;
  border-bottom: 1px solid var(--border, #e8e8e5);
}

.tpe-tc-kind-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.tpe-tc-kind-badge[data-kind="insert"] {
  background: var(--success-soft, rgba(5,150,105,0.10));
  color: var(--success, #059669);
  border: 1px solid rgba(5,150,105,0.3);
}
.tpe-tc-kind-badge[data-kind="delete"] {
  background: var(--danger-soft, rgba(220,38,38,0.08));
  color: var(--danger, #dc2626);
  border: 1px solid rgba(220,38,38,0.25);
}
.tpe-tc-header-meta {
  font-size: 11px;
  color: var(--fg-muted, #6b6b68);
  flex-shrink: 0;
}

/* Changed text preview */
.tpe-tc-diff-preview {
  margin: 8px 12px 0;
  padding: 6px 8px;
  border-radius: var(--radius-md, 6px);
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
  max-height: 72px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.tpe-tc-diff-preview[data-kind="insert"] {
  background: var(--success-soft, rgba(5,150,105,0.08));
  color: var(--success, #059669);
  border-left: 2px solid var(--success, #059669);
}
.tpe-tc-diff-preview[data-kind="delete"] {
  background: var(--danger-soft, rgba(220,38,38,0.07));
  color: var(--danger, #dc2626);
  text-decoration: line-through;
  text-decoration-color: var(--danger, #dc2626);
  border-left: 2px solid var(--danger, #dc2626);
}
.tpe-tc-diff-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--fg-faint, #a8a8a5);
  padding: 8px 12px 2px;
}

/* Author row */
.tpe-tc-popover-body {
  padding: 6px 12px 8px;
  display: flex;
  align-items: center;
  gap: 7px;
}
.tpe-tc-author-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent-soft, rgba(37,99,235,0.12));
  color: var(--accent, #2563eb);
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tpe-tc-author-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--fg, #1a1a1a);
}

.tpe-tc-popover-actions {
  display: flex;
  gap: 6px;
  padding: 0 12px 12px;
}
.tpe-tc-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: var(--radius-md, 6px);
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-sans, sans-serif);
  cursor: pointer;
  border: 1px solid transparent;
  transition: background var(--transition-fast, 100ms ease),
              border-color var(--transition-fast, 100ms ease),
              color var(--transition-fast, 100ms ease);
  white-space: nowrap;
}
.tpe-tc-btn[data-disabled="true"] {
  opacity: 0.35;
  cursor: not-allowed;
}
.tpe-tc-btn-accept {
  background: var(--success-soft, rgba(5,150,105,0.08));
  border-color: var(--success, #059669);
  color: var(--success, #059669);
}
.tpe-tc-btn-accept:hover:not([data-disabled="true"]) {
  background: var(--success, #059669);
  color: #fff;
}
.tpe-tc-btn-reject {
  background: var(--danger-soft, rgba(220,38,38,0.06));
  border-color: var(--danger, #dc2626);
  color: var(--danger, #dc2626);
}
.tpe-tc-btn-reject:hover:not([data-disabled="true"]) {
  background: var(--danger, #dc2626);
  color: #fff;
}
.tpe-tc-permission-note {
  padding: 0 12px 10px;
  font-size: 11px;
  color: var(--fg-faint, #a8a8a5);
  text-align: center;
}
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
const popoverPluginKey = new PluginKey("trackChangesPopover");

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) {
    const m = Math.round(diff / 60_000);
    return `${m}m ago`;
  }
  if (diff < 86_400_000) {
    const h = Math.round(diff / 3_600_000);
    return `${h}h ago`;
  }
  const d = Math.round(diff / 86_400_000);
  return `${d}d ago`;
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

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/**
 * Check if the current actor can accept/reject a change made by changeAuthorId.
 * Mirrors the logic in trackChanges.ts so the UI disables buttons proactively.
 */
function canActOnChange(
  actor: TrackChangesAuthor | null,
  changeAuthorId: string | null,
): boolean {
  if (!actor) return false;
  const roles = actor.roles ?? [];
  if (roles.length === 0) return true;
  if (roles.includes("author")) return true;
  return actor.id === changeAuthorId;
}

/**
 * Surface-level UI for track-changes. Two plugins:
 *   - a banner pinned to the top-right of the editor when tracking is on.
 *   - a rich popover on `<ins>` / `<del>` marks with Accept / Reject
 *     buttons that are role-gated (Authors can act on anyone's changes;
 *     contributors/reviewers only on their own).
 */
export const TrackChangesOverlay = Extension.create({
  name: "trackChangesOverlay",

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [bannerPlugin(editor), popoverPlugin(editor)];
  },
});

// ─── Banner plugin ──────────────────────────────────────────────────────────

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
<span class="tpe-tc-banner-label">Tracking changes</span>
<span class="tpe-tc-banner-author"></span>`;

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
          const r = view.dom.getBoundingClientRect();
          banner.style.top = `${r.top + 12}px`;
          banner.style.right = `${window.innerWidth - r.right + 12}px`;
        }
      };

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

// ─── Popover plugin ─────────────────────────────────────────────────────────

function popoverPlugin(editor: Editor): Plugin {
  return new Plugin({
    key: popoverPluginKey,
    view(view) {
      ensureStyles();

      const pop = document.createElement("div");
      pop.className = "tpe-tc-popover";
      pop.setAttribute("data-visible", "false");
      document.body.appendChild(pop);

      let currentEl: HTMLElement | null = null;
      let hideTimer: number | undefined;

      // ── Helpers ───────────────────────────────────────────────────────

      const getStorage = () =>
        editor.storage.trackChanges as TrackChangesStorage | undefined;

      const doHide = () => {
        pop.setAttribute("data-visible", "false");
        currentEl = null;
      };

      const scheduleHide = () => {
        hideTimer = window.setTimeout(doHide, 200);
      };

      const cancelHide = () => {
        if (hideTimer !== undefined) {
          window.clearTimeout(hideTimer);
          hideTimer = undefined;
        }
      };

      // ── Render ────────────────────────────────────────────────────────

      const show = (el: HTMLElement) => {
        cancelHide();
        currentEl = el;

        const kindRaw = el.getAttribute("data-track-change");
        const kind = kindRaw === "delete" ? "delete" : "insert";
        const author = el.getAttribute("data-author") ?? "Unknown";
        const authorId = el.getAttribute("data-author-id") ?? null;
        const changeId = el.getAttribute("data-change-id") ?? null;
        const tsAttr = el.getAttribute("data-timestamp");
        const ts = tsAttr ? Number(tsAttr) : NaN;

        // Collect all sibling elements that share the same changeId so the
        // preview shows the full logical change, not just the hovered fragment.
        let changedText = "";
        if (changeId) {
          const allMarks = document.querySelectorAll<HTMLElement>(
            `[data-track-change][data-change-id="${CSS.escape(changeId)}"]`,
          );
          changedText = Array.from(allMarks)
            .map((m) => m.textContent ?? "")
            .join("");
        }
        if (!changedText) changedText = el.textContent ?? "";
        // Truncate very long changes for display
        const MAX_PREVIEW = 120;
        const previewText =
          changedText.length > MAX_PREVIEW
            ? `${changedText.slice(0, MAX_PREVIEW)}…`
            : changedText;

        const storage = getStorage();
        const actor = storage?.author ?? null;
        const canAct = canActOnChange(actor, authorId);

        const kindLabel = kind === "insert" ? "Inserted" : "Deleted";
        const kindIcon  = kind === "insert" ? "+" : "−";
        const metaText  = Number.isFinite(ts) ? formatRelative(ts) : "";

        pop.innerHTML = `
<div class="tpe-tc-popover-header">
  <span class="tpe-tc-kind-badge" data-kind="${kind}">${kindIcon} ${escapeHtml(kindLabel)}</span>
  ${metaText ? `<span class="tpe-tc-header-meta">${escapeHtml(metaText)}</span>` : ""}
</div>
${previewText ? `
<div class="tpe-tc-diff-label">${kind === "insert" ? "Added" : "Removed"}</div>
<div class="tpe-tc-diff-preview" data-kind="${kind}">${escapeHtml(previewText)}</div>
` : ""}
<div class="tpe-tc-popover-body">
  <span class="tpe-tc-author-avatar">${escapeHtml(initials(author))}</span>
  <span class="tpe-tc-author-name">${escapeHtml(author)}</span>
</div>
<div class="tpe-tc-popover-actions">
  <button class="tpe-tc-btn tpe-tc-btn-accept" data-change-id="${escapeHtml(changeId ?? "")}" data-disabled="${canAct ? "false" : "true"}" title="${canAct ? "Accept this change" : "Only the document author can accept others’ changes"}">✓ Accept</button>
  <button class="tpe-tc-btn tpe-tc-btn-reject" data-change-id="${escapeHtml(changeId ?? "")}" data-disabled="${canAct ? "false" : "true"}" title="${canAct ? "Reject this change" : "Only the document author can reject others’ changes"}">✕ Reject</button>
</div>
${!canAct ? `<div class="tpe-tc-permission-note">Only authors can accept or reject changes</div>` : ""}
`;

        // Wire up buttons
        const acceptBtn = pop.querySelector<HTMLButtonElement>(".tpe-tc-btn-accept");
        const rejectBtn = pop.querySelector<HTMLButtonElement>(".tpe-tc-btn-reject");

        acceptBtn?.addEventListener("click", (e) => {
          e.stopPropagation();
          if (acceptBtn.getAttribute("data-disabled") === "true") return;
          if (changeId) editor.chain().focus().acceptChange(changeId).run();
          doHide();
        });

        rejectBtn?.addEventListener("click", (e) => {
          e.stopPropagation();
          if (rejectBtn.getAttribute("data-disabled") === "true") return;
          if (changeId) editor.chain().focus().rejectChange(changeId).run();
          doHide();
        });

        // ── Positioning ────────────────────────────────────────────────
        // The popover is position:fixed, so coordinates come directly from
        // getBoundingClientRect() — no scrollY/scrollX adjustment needed.
        // Previous code added window.scrollY which caused the popover to
        // drift below the mark on any scrolled page.
        const POP_W = 280;
        const POP_H = 200; // conservative estimate; actual height rendered after innerHTML

        const rect = el.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Prefer below the mark; flip above only if below is too tight
        const top = spaceBelow >= POP_H + 8
          ? rect.bottom + 6
          : spaceAbove >= POP_H + 8
            ? rect.top - POP_H - 6
            : rect.bottom + 6; // fallback: below even if tight

        // Horizontally center on the mark, clamped to viewport
        const idealLeft = rect.left + rect.width / 2 - POP_W / 2;
        const left = Math.max(8, Math.min(idealLeft, window.innerWidth - POP_W - 8));

        pop.style.top  = `${Math.max(8, top)}px`;
        pop.style.left = `${left}px`;
        pop.setAttribute("data-visible", "true");
      };

      // ── Event wiring ─────────────────────────────────────────────────

      const onOver = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        const el = target?.closest<HTMLElement>(
          "ins[data-track-change], del[data-track-change]",
        );
        if (!el) {
          if (currentEl && !pop.contains(target)) scheduleHide();
          return;
        }
        if (el === currentEl) {
          cancelHide();
          return;
        }
        show(el);
      };

      const onLeave = (event: MouseEvent) => {
        const related = event.relatedTarget as HTMLElement | null;
        if (pop.contains(related)) {
          cancelHide();
          return;
        }
        scheduleHide();
      };

      const onPopOver = () => cancelHide();
      const onPopLeave = () => scheduleHide();

      view.dom.addEventListener("mouseover", onOver);
      view.dom.addEventListener("mouseleave", onLeave);
      pop.addEventListener("mouseover", onPopOver);
      pop.addEventListener("mouseleave", onPopLeave);

      return {
        destroy() {
          view.dom.removeEventListener("mouseover", onOver);
          view.dom.removeEventListener("mouseleave", onLeave);
          pop.removeEventListener("mouseover", onPopOver);
          pop.removeEventListener("mouseleave", onPopLeave);
          if (hideTimer !== undefined) window.clearTimeout(hideTimer);
          pop.remove();
        },
      };
    },
  });
}
