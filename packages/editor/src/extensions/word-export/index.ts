import type { EditorExtensionModule } from "../../core/types";
import type { WordExportOptions } from "./serializer";
import { PageBreakNode } from "./PageBreak";
import { exportToWord } from "./serializer";
import { IconExportWord, IconPageBreak } from "../../react/icons";

/**
 * Word export module. Adds:
 *   - A `pageBreak` TipTap node and an `insertPageBreak` command.
 *   - An "Export Word" toolbar button that downloads the document as a .docx.
 *   - An "Insert Page Break" toolbar button.
 *
 * Configuration via `ctx.features.wordExport`:
 *   header?: string        — text printed in every page header
 *   footer?: string|false  — custom footer text; false disables; undefined = page numbers
 *   fileName?: string      — downloaded file name without extension
 */
export const wordExportModule: EditorExtensionModule = {
  id: "word-export",
  name: "Word export",
  description:
    "Exports the TipTap document to a .docx file with full formatting, page breaks, headers, and footers.",

  tiptap: () => [PageBreakNode],

  toolbar: (ctx) => {
    const config = (ctx.features.wordExport ?? {}) as WordExportOptions & {
      fileName?: string;
    };

    return [
      { kind: "divider", id: "export-divider" },
      {
        kind: "button",
        id: "word-insert-page-break",
        label: "Page break",
        title: "Insert page break",
        icon: IconPageBreak(),
        onRun: (editor) => editor.chain().focus().insertPageBreak().run(),
      },
      {
        kind: "button",
        id: "word-export",
        label: "Export Word",
        title: "Export to Word (.docx)",
        icon: IconExportWord(),
        onRun: (editor) => {
          const json = editor.getJSON();
          exportToWord(json, {
            header: config.header,
            footer: config.footer,
            fileName: config.fileName,
          }).catch((err: unknown) => {
            console.error("[word-export] export failed", err);
          });
        },
      },
    ];
  },
};

export { PageBreakNode } from "./PageBreak";
export { exportToWord } from "./serializer";
export type { WordExportOptions } from "./serializer";
