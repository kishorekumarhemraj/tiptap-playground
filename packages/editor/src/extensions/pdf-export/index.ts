import { IconPDF } from "../../react/icons";
import type { EditorExtensionModule } from "../../core/types";
import { exportToPDF } from "./serializer";

export const pdfExportModule: EditorExtensionModule = {
  id: "pdf-export",
  name: "PDF export",
  description: "Export the document as a PDF using @react-pdf/renderer.",

  tiptap: () => [],

  toolbar: () => [
    {
      kind: "button",
      id: "exportPDF",
      label: "Export PDF",
      title: "Download As PDF",
      icon: IconPDF(),
      onRun: (editor) => {
        const json = editor.getJSON();
        exportToPDF(json, { fileName: "document" }).catch(console.error);
      },
    },
  ],
};

export { exportToPDF } from "./serializer";
export type { PDFExportOptions } from "./serializer";
