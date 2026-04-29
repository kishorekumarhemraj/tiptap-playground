import { Extension } from "@tiptap/core";
import { Pages } from "./Pages";
import { PageBreak } from "./PageBreak";
import type { PagesOptions } from "./Pages";

export interface PageKitOptions {
  /** Options forwarded to the Pages extension. Set to `false` to disable. */
  pages: Partial<PagesOptions> | false;
  /** Options forwarded to the PageBreak extension. Set to `false` to disable. */
  pagebreak: { label?: string } | false;
}

/**
 * Convenience bundle that registers Pages + PageBreak together —
 * mirrors the shape of TipTap Pro's PageKit without requiring a license.
 *
 * Usage:
 * ```ts
 * PageKit.configure({
 *   pages: { pageFormat: 'A4', footer: 'Page {page} of {total}', zoom: 1 },
 *   pagebreak: { label: 'Page break' },
 * })
 * ```
 */
export const PageKit = Extension.create<PageKitOptions>({
  name: "pageKit",

  addOptions() {
    return {
      pages: {},
      pagebreak: {},
    };
  },

  addExtensions() {
    const extensions = [];

    if (this.options.pages !== false) {
      extensions.push(Pages.configure(this.options.pages ?? {}));
    }

    if (this.options.pagebreak !== false) {
      extensions.push(PageBreak.configure(this.options.pagebreak ?? {}));
    }

    return extensions;
  },
});
