import {
  Table as DocxTable,
  Paragraph,
  TableCell,
  TableRow,
  WidthType,
} from "docx";
import type { JSONContent } from "@tiptap/core";
import type { Exporter } from "../../exporter/Exporter";

export const Table = (
  content: JSONContent[] | undefined,
  t: Exporter<any, any, any, any>
) => {
  const rows: TableRow[] = [];
  if (!content) return new DocxTable({ rows: [] });

  for (const row of content) {
    if (row.type !== "tableRow" || !row.content) continue;

    const cells: TableCell[] = [];
    for (const cell of row.content) {
      if (cell.type !== "tableCell" && cell.type !== "tableHeader") continue;

      const colspan = cell.attrs?.colspan || 1;
      const rowspan = cell.attrs?.rowspan || 1;

      cells.push(
        new TableCell({
          columnSpan: colspan,
          rowSpan: rowspan,
          children: [
            new Paragraph({
              children: t.transformInlineContent(
                cell.content?.[0]?.content || []
              ),
              run: {
                bold: cell.type === "tableHeader",
              },
            }),
          ],
        })
      );
    }
    rows.push(new TableRow({ children: cells }));
  }

  return new DocxTable({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
};
