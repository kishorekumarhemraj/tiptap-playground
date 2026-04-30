import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";

export type PageFormat = "A4" | "Letter" | "A3" | "A5" | "Legal";

/** Physical page dimensions in CSS pixels at 96 dpi. */
const PAGE_DIMENSIONS: Record<PageFormat, { width: number; height: number }> = {
  A4:     { width: 794,  height: 1123 },
  Letter: { width: 816,  height: 1056 },
  A3:     { width: 1123, height: 1587 },
  A5:     { width: 559,  height: 794  },
  Legal:  { width: 816,  height: 1344 },
};

export interface PagesPluginOptions {
  pageFormat: PageFormat;
  headerHeight: number;
  footerHeight: number;
  pageGap: number;
  pageGapBackground: string;
  header: string;
  footer: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

interface PluginState {
  decorations: DecorationSet;
}

export const pagesPluginKey = new PluginKey<PluginState>("tpe-pages");

/** Meta key used to push a new DecorationSet into the plugin state. */
const DECO_META = "tpe-pages-decos";

/** Meta key used to push updated options into the plugin state. */
export const OPTIONS_META = "tpe-pages-options";

// ─── Separator DOM factory ────────────────────────────────────────────────────

function createSeparatorDOM(
  opts: PagesPluginOptions,
  pageNumber: number,
  totalPages: number,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "tpe-page-separator";
  wrap.contentEditable = "false";

  const { footer, header, headerHeight, footerHeight, pageGap, pageGapBackground } =
    opts;

  if (footer && footerHeight > 0) {
    const footerEl = document.createElement("div");
    footerEl.className = "tpe-page-footer-area";
    footerEl.style.height = `${footerHeight}px`;
    footerEl.textContent = footer
      .replace(/\{page\}/g, String(pageNumber))
      .replace(/\{total\}/g, String(totalPages));
    wrap.appendChild(footerEl);
  }

  const gap = document.createElement("div");
  gap.className = "tpe-page-gap";
  gap.style.cssText = `height:${pageGap}px;background:${pageGapBackground}`;
  wrap.appendChild(gap);

  if (header && headerHeight > 0) {
    const headerEl = document.createElement("div");
    headerEl.className = "tpe-page-header-area";
    headerEl.style.height = `${headerHeight}px`;
    headerEl.textContent = header
      .replace(/\{page\}/g, String(pageNumber + 1))
      .replace(/\{total\}/g, String(totalPages));
    wrap.appendChild(headerEl);
  }

  return wrap;
}

// ─── Measurement ──────────────────────────────────────────────────────────────

/**
 * Return the block's own height plus any immediately-preceding widget
 * decorations (e.g. block-instruction hint rows). Those widgets are not
 * ProseMirror nodes so they don't appear in doc.childCount, but they do
 * take up vertical space and must be counted to keep overflow math accurate.
 */
function blockHeightWithWidgets(dom: HTMLElement): number {
  let h = dom.offsetHeight;
  let prev = dom.previousElementSibling as HTMLElement | null;
  while (prev && prev.classList.contains("ProseMirror-widget")) {
    h += prev.offsetHeight;
    prev = prev.previousElementSibling as HTMLElement | null;
  }
  return h;
}

/**
 * Walk every top-level block in the document, accumulate their rendered
 * heights, and insert a page-separator widget decoration each time the
 * cumulative height would overflow the current page's content area.
 *
 * We use `offsetHeight` on each block DOM element (not `offsetTop`) so
 * that previously-inserted separator widgets — which push blocks down —
 * do not corrupt our measurements. Widget decorations preceding each block
 * (e.g. instruction hints) are also included in the tally.
 */
function computeDecorations(
  view: EditorView,
  opts: PagesPluginOptions,
): DecorationSet {
  const { doc } = view.state;
  const fmt = PAGE_DIMENSIONS[opts.pageFormat] ?? PAGE_DIMENSIONS.A4;
  const pageContentHeight =
    fmt.height -
    opts.headerHeight -
    opts.footerHeight -
    opts.marginTop -
    opts.marginBottom;

  // First pass: collect (pos, height, isHardBreak) for each top-level block.
  type BlockInfo = { pos: number; height: number; isHardBreak: boolean };
  const blocks: BlockInfo[] = [];
  let pos = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const node = doc.child(i);
    const dom = view.nodeDOM(pos);
    blocks.push({
      pos,
      height: dom instanceof HTMLElement ? blockHeightWithWidgets(dom) : 0,
      isHardBreak: node.type.name === "pageBreak",
    });
    pos += node.nodeSize;
  }

  // Second pass: decide where to insert separators and count total pages.
  type SeparatorEntry = { pos: number; pageNumber: number };
  const separators: SeparatorEntry[] = [];
  let cumHeight = 0;
  let pageNumber = 1;

  for (const block of blocks) {
    if (block.isHardBreak) {
      separators.push({ pos: block.pos, pageNumber });
      pageNumber++;
      // The page-break node itself sits on the new page, so seed cumHeight
      // with its rendered height to keep subsequent overflow math accurate.
      cumHeight = block.height;
      continue;
    }

    if (cumHeight > 0 && cumHeight + block.height > pageContentHeight) {
      separators.push({ pos: block.pos, pageNumber });
      pageNumber++;
      cumHeight = block.height;
    } else {
      cumHeight += block.height;
    }
  }

  const totalPages = pageNumber;

  const decorations = separators.map(({ pos: p, pageNumber: pn }) =>
    Decoration.widget(
      p,
      () => createSeparatorDOM(opts, pn, totalPages),
      { side: -1, key: `tpe-sep-${p}-${pn}` },
    ),
  );

  return DecorationSet.create(doc, decorations);
}

// ─── Plugin factory ───────────────────────────────────────────────────────────

export function createPagesPlugin(
  getOptions: () => PagesPluginOptions,
): Plugin<PluginState> {
  return new Plugin<PluginState>({
    key: pagesPluginKey,

    state: {
      init: () => ({ decorations: DecorationSet.empty }),
      apply(tr, old) {
        const decos: DecorationSet | undefined = tr.getMeta(DECO_META);
        if (decos) return { decorations: decos };
        if (tr.docChanged) return { decorations: old.decorations.map(tr.mapping, tr.doc) };
        return old;
      },
    },

    props: {
      decorations(state) {
        return pagesPluginKey.getState(state)?.decorations;
      },
    },

    view(editorView) {
      let rafId: number | null = null;

      const schedule = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (editorView.isDestroyed) return;
          const decorations = computeDecorations(editorView, getOptions());
          editorView.dispatch(
            editorView.state.tr.setMeta(DECO_META, decorations),
          );
        });
      };

      // Measure after first paint.
      schedule();

      // Re-measure whenever window resizes (font size, scroll bar changes etc).
      const onResize = () => schedule();
      window.addEventListener("resize", onResize);

      return {
        update(view, prevState) {
          if (view.state.doc !== prevState.doc) schedule();
        },
        destroy() {
          if (rafId !== null) cancelAnimationFrame(rafId);
          window.removeEventListener("resize", onResize);
        },
      };
    },
  });
}

export { PAGE_DIMENSIONS };
