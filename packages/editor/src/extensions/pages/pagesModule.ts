import type { EditorExtensionModule } from "../../core/types";
import { Pages } from "./Pages";

/**
 * Integrates the Pages extension into the standard editor module system.
 * Handles real page overflow detection and visual page separation using
 * ProseMirror widget decorations — content flows to the next page
 * automatically, like Microsoft Word.
 *
 * Note: PageBreak node registration is intentionally left to wordExportModule
 * to avoid name conflicts (both use the "pageBreak" node name).
 */
export const pagesModule: EditorExtensionModule = {
  id: "pages",
  name: "Pages",
  description: "A4 page layout with automatic overflow pagination.",

  tiptap: () => [
    Pages.configure({
      pageFormat: "A4",
      margin: { top: 60, right: 80, bottom: 60, left: 80 },
      pageGap: 40,
      pageGapBackground: "#f1f1ef",
      headerHeight: 0,
      footerHeight: 0,
      header: "",
      footer: "",
      zoom: 1,
    }),
  ],
};
