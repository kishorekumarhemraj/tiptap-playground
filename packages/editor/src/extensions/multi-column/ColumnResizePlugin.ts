import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, PluginView } from "@tiptap/pm/state";
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view";
import { Node } from "@tiptap/pm/model";

// ─── Types ────────────────────────────────────────────────────────────────────

type ColumnData = {
  element: HTMLElement;
  colId: string;
  node: Node;
  posBeforeNode: number;
};

type ColumnDataWithWidths = ColumnData & {
  widthPx: number;
  widthFlex: number;
};

type DefaultState = { type: "default" };
type HoverState = {
  type: "hover";
  left: ColumnData;
  right: ColumnData;
};
type ResizeState = {
  type: "resize";
  startX: number;
  left: ColumnDataWithWidths;
  right: ColumnDataWithWidths;
};
type ColumnState = DefaultState | HoverState | ResizeState;

const KEY = new PluginKey<ColumnState>("column-resize");

const MARGIN_PX = 20;
const MIN_FLEX = 0.1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findColumnNodeByColId(
  view: EditorView,
  colId: string,
): { node: Node; posBeforeNode: number } | null {
  let result: { node: Node; posBeforeNode: number } | null = null;
  view.state.doc.descendants((node, pos) => {
    if (result) return false;
    if (node.type.name === "column" && node.attrs.colId === colId) {
      result = { node, posBeforeNode: pos };
      return false;
    }
  });
  return result;
}

function getHoverOrDefault(
  view: EditorView,
  event: MouseEvent,
  editable: boolean,
): DefaultState | HoverState {
  if (!editable) return { type: "default" };

  const target = event.target as HTMLElement | null;
  if (!target || !view.dom.contains(target)) return { type: "default" };

  const colEl = target.closest<HTMLElement>(".editor-column");
  if (!colEl) return { type: "default" };

  const rect = colEl.getBoundingClientRect();
  const x = event.clientX;

  const side =
    x < rect.left + MARGIN_PX
      ? "left"
      : x > rect.right - MARGIN_PX
        ? "right"
        : "none";

  if (side === "none") return { type: "default" };

  const adjEl =
    side === "left"
      ? (colEl.previousElementSibling as HTMLElement | null)
      : (colEl.nextElementSibling as HTMLElement | null);

  if (!adjEl?.classList.contains("editor-column")) return { type: "default" };

  const leftEl = side === "left" ? adjEl : colEl;
  const rightEl = side === "left" ? colEl : adjEl;

  const leftColId = leftEl.getAttribute("data-col-id");
  const rightColId = rightEl.getAttribute("data-col-id");
  if (!leftColId || !rightColId) return { type: "default" };

  const leftNP = findColumnNodeByColId(view, leftColId);
  const rightNP = findColumnNodeByColId(view, rightColId);
  if (!leftNP || !rightNP) return { type: "default" };

  return {
    type: "hover",
    left: { element: leftEl, colId: leftColId, ...leftNP },
    right: { element: rightEl, colId: rightColId, ...rightNP },
  };
}

// ─── Plugin view ──────────────────────────────────────────────────────────────

class ColumnResizeView implements PluginView {
  private view: EditorView;
  private editable: boolean;

  constructor(view: EditorView, editable: boolean) {
    this.view = view;
    this.editable = editable;
    view.dom.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
  }

  updateEditable(editable: boolean) {
    this.editable = editable;
  }

  private onMouseDown = (e: MouseEvent) => {
    const hover = getHoverOrDefault(this.view, e, this.editable);
    if (hover.type !== "hover") return;

    e.preventDefault();

    const state: ResizeState = {
      type: "resize",
      startX: e.clientX,
      left: {
        ...hover.left,
        widthPx: hover.left.element.getBoundingClientRect().width,
        widthFlex: hover.left.node.attrs.width as number,
      },
      right: {
        ...hover.right,
        widthPx: hover.right.element.getBoundingClientRect().width,
        widthFlex: hover.right.node.attrs.width as number,
      },
    };
    this.view.dispatch(this.view.state.tr.setMeta(KEY, state));
  };

  private onMouseMove = (e: MouseEvent) => {
    const ps = KEY.getState(this.view.state);
    if (!ps) return;

    if (ps.type !== "resize") {
      const next = getHoverOrDefault(this.view, e, this.editable);
      const same =
        (ps.type === "default" && next.type === "default") ||
        (ps.type !== "default" &&
          next.type !== "default" &&
          ps.left.colId === next.left.colId &&
          ps.right.colId === next.right.colId);
      if (!same) {
        this.view.dispatch(this.view.state.tr.setMeta(KEY, next));
      }
      return;
    }

    const delta = e.clientX - ps.startX;
    // Scale delta by left column's flex width so resize rate is consistent
    const scaledDelta = delta * (ps.left.widthFlex / ps.left.widthPx);

    let newLeft = ps.left.widthFlex + scaledDelta;
    let newRight = ps.right.widthFlex - scaledDelta;

    if (newLeft < MIN_FLEX) {
      newRight -= MIN_FLEX - newLeft;
      newLeft = MIN_FLEX;
    } else if (newRight < MIN_FLEX) {
      newLeft -= MIN_FLEX - newRight;
      newRight = MIN_FLEX;
    }

    this.view.dispatch(
      this.view.state.tr
        .setNodeAttribute(ps.left.posBeforeNode, "width", newLeft)
        .setNodeAttribute(ps.right.posBeforeNode, "width", newRight)
        .setMeta("addToHistory", false),
    );
  };

  private onMouseUp = (e: MouseEvent) => {
    const ps = KEY.getState(this.view.state);
    if (!ps || ps.type !== "resize") return;
    const next = getHoverOrDefault(this.view, e, this.editable);
    this.view.dispatch(this.view.state.tr.setMeta(KEY, next));
  };

  destroy() {
    this.view.dom.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  }
}

// ─── Extension ────────────────────────────────────────────────────────────────

export const ColumnResizeExtension = Extension.create({
  name: "columnResize",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin<ColumnState>({
        key: KEY,

        state: {
          init: () => ({ type: "default" } as ColumnState),
          apply(tr, old) {
            const next = tr.getMeta(KEY) as ColumnState | undefined;
            return next ?? old;
          },
        },

        view(view) {
          return new ColumnResizeView(view, editor.isEditable);
        },

        props: {
          decorations(state) {
            const ps = KEY.getState(state);
            if (!ps || ps.type === "default") return DecorationSet.empty;

            return DecorationSet.create(state.doc, [
              Decoration.node(
                ps.left.posBeforeNode,
                ps.left.posBeforeNode + ps.left.node.nodeSize,
                { style: "box-shadow: 4px 0 0 #94a3b8; cursor: col-resize;" },
              ),
              Decoration.node(
                ps.right.posBeforeNode,
                ps.right.posBeforeNode + ps.right.node.nodeSize,
                { style: "cursor: col-resize;" },
              ),
            ]);
          },
        },
      }),
    ];
  },
});
