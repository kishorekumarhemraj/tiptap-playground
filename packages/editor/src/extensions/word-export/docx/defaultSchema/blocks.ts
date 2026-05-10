import type { JSONContent } from "@tiptap/core";
import {
  CheckBox,
  Table as DocxTable,
  ExternalHyperlink,
  ImageRun,
  IParagraphOptions,
  PageBreak,
  Paragraph,
  ParagraphChild,
  ShadingType,
  TableCell,
  TableRow,
  TextRun,
} from "docx";
import type { BlockMapping } from "../../exporter/mapping";

function blockPropsToStyles(attrs: Record<string, any> = {}): IParagraphOptions {
  return {
    shading: attrs.backgroundColor
      ? { type: ShadingType.CLEAR, fill: attrs.backgroundColor.replace("#", "") }
      : undefined,
    alignment: attrs.textAlign === "left"
      ? undefined
      : attrs.textAlign === "center"
      ? "center"
      : attrs.textAlign === "right"
      ? "right"
      : attrs.textAlign === "justify"
      ? "distribute"
      : undefined,
  };
}

export const docxBlockMappingForDefaultSchema: BlockMapping<
  Promise<Paragraph[] | Paragraph | DocxTable> | Paragraph[] | Paragraph | DocxTable,
  ParagraphChild
> = {
  paragraph: (block, exporter) => {
    return new Paragraph({
      ...blockPropsToStyles(block.attrs),
      children: exporter.transformInlineContent(block.content),
    });
  },
  heading: (block, exporter) => {
    return new Paragraph({
      ...blockPropsToStyles(block.attrs),
      children: exporter.transformInlineContent(block.content),
      heading: `Heading${block.attrs?.level || 1}` as any,
    });
  },
  blockquote: (block, exporter, nestingLevel, index, children) => {
    return new Paragraph({
      style: "BlockQuote",
      ...blockPropsToStyles(block.attrs),
      children: exporter.transformInlineContent(block.content),
    });
  },
  codeBlock: (block) => {
    const textContent = block.content?.[0]?.text || "";
    return new Paragraph({
      style: "SourceCode",
      children: textContent.split("\n").map((line, index) => {
        return new TextRun({ text: line, break: index > 0 ? 1 : 0 });
      }),
    });
  },
  pageBreak: () => {
    return new Paragraph({ children: [new PageBreak()] });
  },
  horizontalRule: () => {
    return new Paragraph({
      border: { top: { color: "auto", space: 1, style: "single", size: 1 } },
    });
  },
  column: (block, _exporter, _nestingLevel, _index, children) => {
    const width = block.attrs?.width || 1;
    return new TableCell({
      width: { size: `${width * 100}%`, type: "pct" as any },
      children: (children || []).flatMap((child) => Array.isArray(child) ? child : [child]),
    }) as any;
  },
  columnList: (_block, _exporter, _nestingLevel, _index, children) => {
    return new DocxTable({
      layout: "autofit",
      borders: {
        bottom: { style: "nil" }, top: { style: "nil" },
        left: { style: "nil" }, right: { style: "nil" },
        insideHorizontal: { style: "nil" }, insideVertical: { style: "nil" },
      },
      rows: [
        new TableRow({
          children: (children as unknown as TableCell[]).map((cell, _i, arr) => {
            return new TableCell({
              width: {
                size: `${(parseFloat(`${(cell as any).options.width?.size || "100%"}`) / (arr.length * 100)) * 100}%`,
                type: "pct" as any,
              },
              children: (cell as any).options.children,
            });
          }),
        }),
      ],
    });
  },
  image: async (block, exporter) => {
    const url = block.attrs?.src;
    if (!url) return [];
    try {
      const blob = await exporter.resolveFile(url);
      return [
        new Paragraph({
          ...blockPropsToStyles(block.attrs),
          children: [
            new ImageRun({
              data: await blob.arrayBuffer(),
              type: "png",
              transformation: { width: 500, height: 500 }, // Dummy dimension
              altText: block.attrs?.alt ? { description: block.attrs.alt, name: block.attrs.alt, title: block.attrs.alt } : undefined,
            }),
          ],
        }),
      ];
    } catch {
      return [];
    }
  },
};
