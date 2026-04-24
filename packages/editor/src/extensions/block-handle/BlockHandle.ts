import { Extension } from "@tiptap/core";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
  type EditorState,
} from "@tiptap/pm/state";
import { Fragment, Slice, type Node as PMNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import type { EditorMode } from "../../core/types";

export interface BlockHandleOptions {
  /**
   * Editor-level mode. Drives which cluster buttons are visible:
   *   template - insert, drag, edit-instruction
   *   document - lock chip only (read-only blocks); nothing on
   *              editable blocks - users only modify existing content.
   */
  editorMode?: EditorMode;
  /** Horizontal gap between the cluster and the block. */
  offsetLeft?: number;
  /** Vertical offset of the cluster relative to the block's top. */
  offsetTop?: number;
}

interface TargetBlock {
  pos: number;
  node: PMNode;
  dom: HTMLElement;
}

const blockHandleKey = new PluginKey<BlockHandleState>("blockHandle");

interface BlockHandleState {
  target: TargetBlock | null;
}

const STYLE_TAG_ID = "tpe-block-handle-style";
const STYLE_RULES = `
/* ── Lock marker (gutter icon on locked blocks) ─────────────────────── */
.tpe-block-marker {
  position: absolute;
  top: 0.25em;
  left: -1.6em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25em;
  height: 1.25em;
  color: var(--lock-accent);
  opacity: 0;
  cursor: help;
  user-select: none;
  transition: opacity 120ms ease;
  pointer-events: auto;
}
/* Show colorful icon when the block is hovered */
[data-block-hover] .tpe-block-marker { opacity: 1; }

/* ── Hover cluster ──────────────────────────────────────────────────── */
.tpe-block-cluster {
  position: fixed;
  display: none;
  align-items: center;
  gap: 2px;
  padding: 0;
  z-index: 100;
  user-select: none;
  line-height: 1;
}
.tpe-block-cluster[data-visible="true"] { display: inline-flex; }
.tpe-block-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--fg-faint, #a0a0a0);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}
.tpe-block-btn:hover {
  background: var(--bg-subtle, #f2f2ef);
  color: var(--fg, #1f1f1c);
}
.tpe-block-btn[data-role="drag"] { cursor: grab; }
.tpe-block-btn[data-role="drag"]:active { cursor: grabbing; }
.tpe-block-btn:focus-visible {
  outline: 2px solid var(--accent, #2563eb);
  outline-offset: 1px;
}
.tpe-block-lock-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 6px;
  border-radius: 4px;
  background: var(--bg-subtle, #f2f2ef);
  color: var(--lock-accent, #737373);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}
.tpe-block-lock-chip svg { width: 12px; height: 12px; }
`;

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = STYLE_RULES;
  document.head.appendChild(style);
}

/**
 * Notion-style hover cluster - a floating toolbar that appears to
 * the left of the block under the cursor. Button set is driven by
 * the editor mode:
 *
 *   template:  [ + ] insert  [ :: ] drag  [ 💬 ] instruction
 *   document:  locked / read-only blocks show a [ 🔒 ] chip;
 *              editable blocks show nothing - users only modify
 *              existing content, structure is frozen.
 *
 * Positioning locks to the block's first-line baseline and accounts
 * for the editor container's scroll offset, so the cluster tracks
 * the block even while the page scrolls.
 */
export const BlockHandle = Extension.create<BlockHandleOptions>({
  name: "blockHandle",

  addOptions() {
    return {
      // offsetLeft: distance in px from the block's left edge to the
      // marker's left edge (≈ 1.6em at 15px base). The cluster's right
      // edge aligns here; the cluster itself extends further left via
      // translateX(-100%) so the two gutter elements form one strip.
      offsetLeft: 24,
      offsetTop: 2,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    const editor = this.editor;
    return [createBlockHandlePlugin(options, editor)];
  },
});

function createBlockHandlePlugin(
  options: BlockHandleOptions,
  editor: import("@tiptap/core").Editor,
) {
  return new Plugin<BlockHandleState>({
    key: blockHandleKey,
    state: {
      init: () => ({ target: null }),
      apply: (tr, value) => {
        const meta = tr.getMeta(blockHandleKey) as
          | { target: TargetBlock | null }
          | undefined;
        if (meta) return { target: meta.target };
        return value;
      },
    },
    view(view) {
      ensureStyles();
      const mode = options.editorMode ?? "document";

      const cluster = document.createElement("div");
      cluster.className = "tpe-block-cluster";
      cluster.setAttribute("data-visible", "false");

      const plusBtn = document.createElement("button");
      plusBtn.type = "button";
      plusBtn.className = "tpe-block-btn";
      plusBtn.setAttribute("data-role", "insert");
      plusBtn.setAttribute("aria-label", "Insert block below");
      plusBtn.title = "Insert block below (optionally with an instruction)";
      plusBtn.innerHTML = plusSvg();

      const dragBtn = document.createElement("button");
      dragBtn.type = "button";
      dragBtn.className = "tpe-block-btn";
      dragBtn.setAttribute("data-role", "drag");
      dragBtn.setAttribute("draggable", "true");
      dragBtn.setAttribute("aria-label", "Drag to reorder block");
      dragBtn.title = "Drag to reorder · click to select";
      dragBtn.innerHTML = dragSvg();

      const instructionBtn = document.createElement("button");
      instructionBtn.type = "button";
      instructionBtn.className = "tpe-block-btn";
      instructionBtn.setAttribute("data-role", "instruction");
      instructionBtn.setAttribute("aria-label", "Edit block instruction");
      instructionBtn.title = "Add or edit instruction";
      instructionBtn.innerHTML = bulbSvg();

      const lockChip = document.createElement("span");
      lockChip.className = "tpe-block-lock-chip";

      cluster.appendChild(plusBtn);
      cluster.appendChild(dragBtn);
      cluster.appendChild(instructionBtn);
      cluster.appendChild(lockChip);

      // Append to body so the fixed cluster is never clipped or
      // repositioned by a flex / overflow:auto ancestor.
      document.body.appendChild(cluster);

      // The editor's scroll container. We need it for the scroll
      // listener so the cluster repositions as the user scrolls.
      const scrollHost = view.dom.parentElement ?? document.body;

      let hideTimer: number | null = null;
      let activeBlockDom: HTMLElement | null = null;

      const setTarget = (target: TargetBlock | null) => {
        view.dispatch(view.state.tr.setMeta(blockHandleKey, { target }));
      };

      // Manage data-block-hover on the block element so the always-visible
      // .tpe-block-marker fades when the cluster takes over that gutter column.
      const setHoverDom = (dom: HTMLElement | null) => {
        if (activeBlockDom === dom) return;
        if (activeBlockDom) activeBlockDom.removeAttribute("data-block-hover");
        activeBlockDom = dom;
        if (dom) dom.setAttribute("data-block-hover", "true");
      };

      const positionCluster = (target: TargetBlock | null) => {
        if (!target) {
          cluster.setAttribute("data-visible", "false");
          setHoverDom(null);
          return;
        }
        const lock = getLockDescriptor(target.node);
        const isLocked =
          lock?.mode === "locked" || lock?.mode === "readonly";

        // Visibility matrix:
        //   template + any:    insert + drag + instruction  (no lock chip)
        //   document + locked: lock chip only
        //   document + other:  nothing - editable text only
        const showAuthorButtons = mode === "template";
        const showLockChip = mode === "document" && isLocked;
        const showAnything = showAuthorButtons || showLockChip;

        plusBtn.style.display = showAuthorButtons ? "inline-flex" : "none";
        dragBtn.style.display = showAuthorButtons ? "inline-flex" : "none";
        instructionBtn.style.display = showAuthorButtons
          ? "inline-flex"
          : "none";
        lockChip.style.display = showLockChip ? "inline-flex" : "none";

        if (!showAnything) {
          cluster.setAttribute("data-visible", "false");
          setHoverDom(null);
          return;
        }

        if (showLockChip && lock) {
          lockChip.innerHTML = `${lockSvg(lock.mode)}<span>${
            lock.mode === "readonly" ? "Read-only" : "Locked"
          }</span>`;
          lockChip.title =
            lock.reason ??
            (lock.mode === "readonly"
              ? "Read-only section"
              : "Locked section");
        }

        if (showAuthorButtons) {
          const existing = (target.node.attrs?.instruction as string | null) ?? null;
          instructionBtn.setAttribute(
            "data-has-instruction",
            existing ? "true" : "false",
          );
          instructionBtn.title = existing
            ? `Edit instruction: ${existing}`
            : "Add instruction";
        }

        // The cluster uses position:fixed so coordinates are viewport-space.
        // Vertically centre the icon row on the block's first text line.
        const blockRect = target.dom.getBoundingClientRect();
        const iconHeight = 20;
        const lineH =
          parseFloat(
            window.getComputedStyle(target.dom).lineHeight || "0",
          ) || iconHeight;
        const vCentre = Math.max(0, (lineH - iconHeight) / 2);
        cluster.style.top = `${blockRect.top + vCentre}px`;
        // Align the cluster's RIGHT edge with the marker's LEFT edge so
        // the two gutter elements form one continuous strip:
        //   marker left ≈ blockRect.left − 1.6em (≈ 24px at 15px base)
        //   cluster right = blockRect.left − markerOffset
        //   cluster left  = blockRect.left − markerOffset − clusterWidth
        // We keep markerOffset at the offsetLeft default (24px) and let
        // the cluster extend further left from there.
        const markerOffset = options.offsetLeft ?? 24;
        cluster.style.left = `${blockRect.left - markerOffset}px`;
        cluster.style.transform = "translateX(-100%)";
        cluster.setAttribute("data-visible", "true");
        setHoverDom(target.dom);
      };

      // GUTTER_PX: how many pixels to the LEFT of the editor surface
      // we still track the mouse. Cluster extends markerOffset + ~70px
      // (3 buttons × 20px + gaps) left of the block's content edge.
      const GUTTER_PX = (options.offsetLeft ?? 24) + 80;

      const onGlobalMouseMove = (event: MouseEvent) => {
        const editorRect = view.dom.getBoundingClientRect();
        const inRange =
          event.clientY >= editorRect.top &&
          event.clientY <= editorRect.bottom &&
          event.clientX >= editorRect.left - GUTTER_PX &&
          event.clientX <= editorRect.right;

        if (!inRange) {
          if (hideTimer) { window.clearTimeout(hideTimer); hideTimer = null; }
          setTarget(null);
          positionCluster(null);
          return;
        }
        if (hideTimer) { window.clearTimeout(hideTimer); hideTimer = null; }
        const target = findBlockAtCoords(view, event.clientX, event.clientY);
        setTarget(target);
        positionCluster(target);
      };

      // When the editor content scrolls, the block's viewport position
      // changes but no PM state change fires. Reposition immediately.
      const onScroll = () => {
        const target = blockHandleKey.getState(view.state)?.target;
        if (target) positionCluster(target);
      };

      window.addEventListener("mousemove", onGlobalMouseMove, { passive: true });
      scrollHost.addEventListener("scroll", onScroll, { passive: true });

      const onDragStart = (event: DragEvent) => {
        const target = blockHandleKey.getState(view.state)?.target;
        if (!target) {
          event.preventDefault();
          return;
        }
        const selection = NodeSelection.create(view.state.doc, target.pos);
        view.dispatch(view.state.tr.setSelection(selection));

        const slice = new Slice(Fragment.from(target.node), 0, 0);
        view.dragging = { slice, move: true };

        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/html", target.dom.outerHTML);
          event.dataTransfer.setDragImage(target.dom, 0, 0);
        }
      };

      const onDragEnd = () => {
        view.dragging = null;
      };

      const onDragClick = () => {
        const target = blockHandleKey.getState(view.state)?.target;
        if (!target) return;
        const selection = NodeSelection.create(view.state.doc, target.pos);
        view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
        view.focus();
      };

      const onPlusClick = () => {
        const target = blockHandleKey.getState(view.state)?.target;
        if (!target) return;
        const instruction =
          typeof window !== "undefined"
            ? (
                window.prompt(
                  "Instruction for this block (optional - leave empty for none)",
                  "",
                ) ?? ""
              ).trim()
            : "";
        insertParagraphAfter(view, target, instruction || null);
        view.focus();
      };

      const onInstructionClick = () => {
        const target = blockHandleKey.getState(view.state)?.target;
        if (!target) return;
        if (typeof window === "undefined") return;
        const current = (target.node.attrs?.instruction as string | null) ?? "";
        const next = window.prompt(
          "Block instruction (leave empty to clear)",
          current,
        );
        if (next === null) return; // cancelled
        const trimmed = next.trim();
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            tr.setNodeAttribute(
              target.pos,
              "instruction",
              trimmed ? trimmed : null,
            );
            return true;
          })
          .run();
      };

      dragBtn.addEventListener("dragstart", onDragStart);
      dragBtn.addEventListener("dragend", onDragEnd);
      dragBtn.addEventListener("click", onDragClick);
      plusBtn.addEventListener("click", onPlusClick);
      instructionBtn.addEventListener("click", onInstructionClick);

      return {
        update() {
          const target = blockHandleKey.getState(view.state)?.target;
          positionCluster(target ?? null);
        },
        destroy() {
          window.removeEventListener("mousemove", onGlobalMouseMove);
          scrollHost.removeEventListener("scroll", onScroll);
          dragBtn.removeEventListener("dragstart", onDragStart);
          dragBtn.removeEventListener("dragend", onDragEnd);
          dragBtn.removeEventListener("click", onDragClick);
          plusBtn.removeEventListener("click", onPlusClick);
          instructionBtn.removeEventListener("click", onInstructionClick);
          setHoverDom(null);
          cluster.remove();
          if (hideTimer) window.clearTimeout(hideTimer);
        },
      };
    },
  });
}

function insertParagraphAfter(
  view: EditorView,
  target: TargetBlock,
  instruction: string | null,
) {
  const { state } = view;
  const paragraphType = state.schema.nodes.paragraph;
  if (!paragraphType) return;
  const insertPos = target.pos + target.node.nodeSize;
  const attrs = instruction ? { instruction } : null;
  const paragraph = paragraphType.createAndFill(attrs);
  if (!paragraph) return;
  const tr = state.tr.insert(insertPos, paragraph);
  tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
  tr.scrollIntoView();
  view.dispatch(tr);
}

function findBlockAtCoords(
  view: EditorView,
  clientX: number,
  clientY: number,
): TargetBlock | null {
  const editorRect = view.dom.getBoundingClientRect();
  // If the cursor is in the gutter (left of the editor surface), probe
  // the horizontal centre of the editor so posAtCoords always lands on
  // a real text node at the correct line rather than empty padding.
  const x =
    clientX < editorRect.left
      ? editorRect.left + editorRect.width / 2
      : Math.min(editorRect.right - 4, clientX);
  const y = Math.min(
    editorRect.bottom - 4,
    Math.max(editorRect.top + 4, clientY),
  );
  const hit = view.posAtCoords({ left: x, top: y });
  if (!hit) return null;
  return resolveTopBlockWithDom(view, hit.inside >= 0 ? hit.inside : hit.pos);
}

function resolveTopBlock(
  state: EditorState,
  pos: number,
): { pos: number; node: PMNode } | null {
  const safe = Math.max(0, Math.min(pos, state.doc.content.size - 1));
  const $pos = state.doc.resolve(safe);
  if ($pos.depth < 1) return null;
  const nodePos = $pos.before(1);
  const node = state.doc.nodeAt(nodePos);
  if (!node) return null;
  return { pos: nodePos, node };
}

function resolveTopBlockWithDom(
  view: EditorView,
  pos: number,
): TargetBlock | null {
  const hit = resolveTopBlock(view.state, pos);
  if (!hit) return null;
  const dom = view.nodeDOM(hit.pos);
  if (!(dom instanceof HTMLElement)) return null;
  return { ...hit, dom };
}

interface LockDescriptor {
  mode: "locked" | "readonly" | "conditional";
  reason: string | null;
}

function getLockDescriptor(node: PMNode): LockDescriptor | null {
  if (node.type.name !== "lockedBlock") return null;
  const mode = node.attrs?.mode;
  if (mode !== "locked" && mode !== "readonly" && mode !== "conditional") {
    return null;
  }
  return { mode, reason: (node.attrs?.reason as string | null) ?? null };
}

function plusSvg(): string {
  return `
<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
  <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`.trim();
}

function dragSvg(): string {
  return `
<svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
  <circle cx="3.5" cy="3" r="1.1" fill="currentColor"/>
  <circle cx="8.5" cy="3" r="1.1" fill="currentColor"/>
  <circle cx="3.5" cy="7" r="1.1" fill="currentColor"/>
  <circle cx="8.5" cy="7" r="1.1" fill="currentColor"/>
  <circle cx="3.5" cy="11" r="1.1" fill="currentColor"/>
  <circle cx="8.5" cy="11" r="1.1" fill="currentColor"/>
</svg>`.trim();
}

function bulbSvg(): string {
  return `
<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
  <path d="M5.5 10a3.5 3.5 0 1 1 5 0c-.4.4-.7.9-.8 1.5v.5h-3.4v-.5c-.1-.6-.4-1.1-.8-1.5z"
        stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="none"/>
  <path d="M6.5 13.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
</svg>`.trim();
}

function lockSvg(mode: "locked" | "readonly" | "conditional"): string {
  if (mode === "readonly") {
    return `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
  <path d="M1.5 8C2.6 5 5 3 8 3s5.4 2 6.5 5c-1.1 3-3.5 5-6.5 5s-5.4-2-6.5-5z"
        stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
  <circle cx="8" cy="8" r="1.75" fill="currentColor"/>
</svg>`;
  }
  return `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
  <rect x="3.2" y="7.2" width="9.6" height="6.6" rx="1.4"
        stroke="currentColor" stroke-width="1.3"/>
  <path d="M5.2 7.2V5a2.8 2.8 0 0 1 5.6 0v2.2"
        stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>
</svg>`;
}
