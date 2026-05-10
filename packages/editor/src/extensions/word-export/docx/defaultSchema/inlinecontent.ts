import type { JSONContent } from "@tiptap/core";
import { ExternalHyperlink, ParagraphChild, TextRun } from "docx";
import type { InlineContentMapping } from "../../exporter/mapping";
import type { DOCXExporter } from "../docxExporter";

export const docxInlineContentMappingForDefaultSchema: InlineContentMapping<
  ParagraphChild,
  TextRun
> = {
  text: (ic, exporter) => {
    return (exporter as DOCXExporter).transformStyledText(ic);
  },
};
