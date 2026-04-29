import { Extension } from "@tiptap/core";
import { createPagesPlugin, pagesPluginKey, PAGE_DIMENSIONS } from "./PagesPlugin";
import type { PageFormat, PagesPluginOptions } from "./PagesPlugin";

export type { PageFormat };

export interface PagesMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PagesOptions {
  pageFormat: PageFormat;
  headerHeight: number;
  footerHeight: number;
  pageGap: number;
  pageGapBackground: string;
  header: string;
  footer: string;
  zoom: number;
  margin: PagesMargin;
}

export interface PagesStorage {
  pageFormat: PageFormat;
  zoom: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pages: {
      setPageFormat: (format: PageFormat) => ReturnType;
      setZoom: (zoom: number) => ReturnType;
    };
  }
}

// ─── Style injection ──────────────────────────────────────────────────────────

const STYLE_ID = "tpe-pages-style";
let styleRefCount = 0;

const STYLE_RULES = `
.tpe-pages-editor {
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,.18), 0 1px 8px rgba(0,0,0,.08);
  outline: none;
  box-sizing: border-box;
  /* width/padding/margin set via CSS vars updated by the extension */
  width: var(--tpe-page-width);
  padding-top: var(--tpe-margin-top);
  padding-bottom: var(--tpe-margin-bottom);
  padding-left: var(--tpe-margin-left);
  padding-right: var(--tpe-margin-right);
  transform: scale(var(--tpe-zoom, 1));
  transform-origin: top center;
  /* compensate for scale so wrapper doesn't show extra whitespace */
  margin-bottom: calc((var(--tpe-zoom, 1) - 1) * var(--tpe-page-height));
}

.tpe-pages-editor:focus {
  outline: none;
}

.tpe-page-separator {
  /* pulled out of the flow — spans the full content width */
  margin-left: calc(-1 * var(--tpe-margin-left));
  margin-right: calc(-1 * var(--tpe-margin-right));
  user-select: none;
  pointer-events: none;
}

.tpe-page-footer-area,
.tpe-page-header-area {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #888;
  background: white;
  padding: 0 var(--tpe-margin-left);
  box-sizing: border-box;
}

.tpe-page-gap {
  width: 100%;
}

.tpe-page-break-node {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  margin: 4px 0;
  color: #aaa;
  font-size: 11px;
  font-style: italic;
  user-select: none;
  cursor: default;
}

.tpe-page-break-node::before,
.tpe-page-break-node::after {
  content: '';
  flex: 1;
  height: 1px;
  background: repeating-linear-gradient(
    to right,
    #ccc 0,
    #ccc 6px,
    transparent 6px,
    transparent 10px
  );
}
`;

function attachStyles() {
  if (typeof document === "undefined") return;
  styleRefCount++;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = STYLE_RULES;
  document.head.appendChild(el);
}

function detachStyles() {
  if (typeof document === "undefined") return;
  styleRefCount = Math.max(0, styleRefCount - 1);
  if (styleRefCount === 0) document.getElementById(STYLE_ID)?.remove();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyVars(el: HTMLElement, opts: PagesOptions): void {
  const fmt = PAGE_DIMENSIONS[opts.pageFormat] ?? PAGE_DIMENSIONS.A4;
  const { margin, zoom } = opts;
  el.style.setProperty("--tpe-page-width", `${fmt.width}px`);
  el.style.setProperty("--tpe-page-height", `${fmt.height}px`);
  el.style.setProperty("--tpe-margin-top", `${margin.top}px`);
  el.style.setProperty("--tpe-margin-bottom", `${margin.bottom}px`);
  el.style.setProperty("--tpe-margin-left", `${margin.left}px`);
  el.style.setProperty("--tpe-margin-right", `${margin.right}px`);
  el.style.setProperty("--tpe-zoom", String(zoom));
}

function buildPluginOptions(opts: PagesOptions): PagesPluginOptions {
  return {
    pageFormat: opts.pageFormat,
    headerHeight: opts.headerHeight,
    footerHeight: opts.footerHeight,
    pageGap: opts.pageGap,
    pageGapBackground: opts.pageGapBackground,
    header: opts.header,
    footer: opts.footer,
    marginTop: opts.margin.top,
    marginBottom: opts.margin.bottom,
    marginLeft: opts.margin.left,
    marginRight: opts.margin.right,
  };
}

// ─── Extension ────────────────────────────────────────────────────────────────

export const Pages = Extension.create<PagesOptions, PagesStorage>({
  name: "pages",

  addOptions() {
    return {
      pageFormat: "A4",
      headerHeight: 0,
      footerHeight: 0,
      pageGap: 40,
      pageGapBackground: "#f1f1ef",
      header: "",
      footer: "",
      zoom: 1,
      margin: { top: 60, right: 80, bottom: 60, left: 80 },
    };
  },

  addStorage(): PagesStorage {
    return {
      pageFormat: this.options.pageFormat,
      zoom: this.options.zoom,
    };
  },

  onCreate() {
    attachStyles();
    const el = this.editor.view.dom as HTMLElement;
    el.classList.add("tpe-pages-editor");
    applyVars(el, this.options);
  },

  onDestroy() {
    const el = this.editor.view.dom as HTMLElement;
    el.classList.remove("tpe-pages-editor");
    detachStyles();
  },

  addCommands() {
    return {
      setPageFormat:
        (format: PageFormat) =>
        ({ tr, dispatch }) => {
          this.options.pageFormat = format;
          this.storage.pageFormat = format;
          // Update CSS vars immediately.
          const el = this.editor.view.dom as HTMLElement;
          applyVars(el, this.options);
          // Re-trigger measurement by dispatching an empty tr.
          if (dispatch) {
            dispatch(tr);
            // Schedule remeasure via a synthetic doc-change ping.
            requestAnimationFrame(() => {
              if (!this.editor.isDestroyed) {
                const pluginState = pagesPluginKey.getState(this.editor.state);
                if (pluginState) {
                  // Force plugin view.update by making it think the doc changed.
                  // The plugin schedules its own RAF so this is just a nudge.
                  this.editor.view.dispatch(this.editor.state.tr);
                }
              }
            });
          }
          return true;
        },

      setZoom:
        (zoom: number) =>
        ({ tr, dispatch }) => {
          const clamped = Math.max(0.25, Math.min(4, zoom));
          this.options.zoom = clamped;
          this.storage.zoom = clamped;
          const el = this.editor.view.dom as HTMLElement;
          applyVars(el, this.options);
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    // Pass a closure so the plugin always reads the latest options
    // (mutations from setPageFormat/setZoom are reflected immediately).
    const getOptions = () => buildPluginOptions(this.options);
    return [createPagesPlugin(getOptions)];
  },
});
