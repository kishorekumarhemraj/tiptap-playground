import type { JSONContent } from "@tiptap/core";
import { DOCXExporter } from "./docx/docxExporter";
import { docxBlockMappingForDefaultSchema } from "./docx/defaultSchema/blocks";
import { docxInlineContentMappingForDefaultSchema } from "./docx/defaultSchema/inlinecontent";
import { docxStyleMappingForDefaultSchema } from "./docx/defaultSchema/styles";

export interface WordExportOptions {
  header?: string;
  footer?: string | false;
  fileName?: string;
  documentTitle?: string;
}

export async function exportToWord(
  json: JSONContent,
  options: WordExportOptions = {}
): Promise<void> {
  const exporter = new DOCXExporter({
    blockMapping: docxBlockMappingForDefaultSchema as any,
    inlineContentMapping: docxInlineContentMappingForDefaultSchema as any,
    styleMapping: docxStyleMappingForDefaultSchema as any,
  });

  const blob = await exporter.toBlob(json.content || []);
  const url = URL.createObjectURL(blob as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${options.fileName || "document"}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
