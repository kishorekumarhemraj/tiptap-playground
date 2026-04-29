import type { JSONContent } from "@tiptap/core";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  PageBreak as DocxPageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  TextRun,
  UnderlineType,
  convertInchesToTwip,
} from "docx";

export interface WordExportOptions {
  /** Text shown in the document header on every page. Omit to disable. */
  header?: string;
  /**
   * Footer content. Omit or set `undefined` for automatic page numbers.
   * Pass `false` to disable the footer entirely.
   * Pass a string for custom static text.
   */
  footer?: string | false;
  /** Filename for the downloaded file, without extension. Defaults to "document". */
  fileName?: string;
  /** Overrides the document title (defaults to the first H1 text if found). */
  documentTitle?: string;
}

// ─── numbering references ────────────────────────────────────────────────────

const BULLET_REF = "tiptap-bullet";
const ORDERED_REF = "tiptap-ordered";
const TASK_REF = "tiptap-task";

// ─── helpers ─────────────────────────────────────────────────────────────────

function headingLevel(
  level: number,
): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  const map: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> =
    {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    };
  return map[level] ?? HeadingLevel.HEADING_1;
}

function alignment(
  align: string | null | undefined,
): (typeof AlignmentType)[keyof typeof AlignmentType] {
  switch (align) {
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    case "justify":
      return AlignmentType.BOTH;
    default:
      return AlignmentType.LEFT;
  }
}

function stripHash(hex: string | undefined): string | undefined {
  return hex ? hex.replace(/^#/, "") : undefined;
}

// ─── inline serialization ────────────────────────────────────────────────────

type ParagraphChild = TextRun | ExternalHyperlink;

interface InlineCtx {
  monospace?: boolean;
}

function serializeInline(
  nodes: readonly JSONContent[] | undefined,
  ctx: InlineCtx = {},
): ParagraphChild[] {
  if (!nodes?.length) return [];
  const result: ParagraphChild[] = [];

  for (const node of nodes) {
    if (node.type === "hardBreak") {
      result.push(new TextRun({ break: 1 }));
      continue;
    }

    if (node.type !== "text") continue;

    const text = node.text ?? "";
    const marks: JSONContent[] = node.marks ?? [];

    let bold = false;
    let italics = false;
    let underline: { type?: (typeof UnderlineType)[keyof typeof UnderlineType] } | undefined;
    let strike = false;
    let subScript = false;
    let superScript = false;
    let color: string | undefined;
    let shadingFill: string | undefined;
    let font: string | undefined;
    let linkHref: string | undefined;

    if (ctx.monospace) font = "Courier New";

    for (const mark of marks) {
      switch (mark.type) {
        case "bold":
          bold = true;
          break;
        case "italic":
          italics = true;
          break;
        case "underline":
          underline = { type: UnderlineType.SINGLE };
          break;
        case "strike":
          strike = true;
          break;
        case "subscript":
          subScript = true;
          break;
        case "superscript":
          superScript = true;
          break;
        case "code":
          font = "Courier New";
          shadingFill = "F0F0F0";
          break;
        case "highlight": {
          const c = mark.attrs?.color as string | undefined;
          shadingFill = stripHash(c) ?? "FFFF00";
          break;
        }
        case "link":
          linkHref = mark.attrs?.href as string | undefined;
          break;
        case "textStyle": {
          const c = mark.attrs?.color as string | undefined;
          if (c) color = stripHash(c);
          break;
        }
      }
    }

    const runProps = {
      text,
      bold: bold || undefined,
      italics: italics || undefined,
      underline: underline,
      strike: strike || undefined,
      subScript: subScript || undefined,
      superScript: superScript || undefined,
      color,
      font: font ? { name: font } : undefined,
      shading: shadingFill
        ? { type: ShadingType.SOLID, fill: shadingFill, color: "auto" }
        : undefined,
    };

    if (linkHref) {
      result.push(
        new ExternalHyperlink({
          link: linkHref,
          children: [new TextRun({ ...runProps, style: "Hyperlink" })],
        }),
      );
    } else {
      result.push(new TextRun(runProps));
    }
  }

  return result;
}

// ─── block serialization ─────────────────────────────────────────────────────

interface BlockCtx {
  listRef?: string;
  listLevel?: number;
  inBlockquote?: boolean;
  inCodeBlock?: boolean;
}

function serializeBlocks(
  nodes: readonly JSONContent[] | undefined,
  ctx: BlockCtx = {},
): Paragraph[] {
  if (!nodes?.length) return [];
  const out: Paragraph[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "paragraph": {
        const align = alignment(node.attrs?.textAlign);
        const children = serializeInline(node.content, {
          monospace: ctx.inCodeBlock,
        });

        out.push(
          new Paragraph({
            children: children.length ? children : [new TextRun("")],
            alignment: align,
            numbering:
              ctx.listRef !== undefined && ctx.listLevel !== undefined
                ? { reference: ctx.listRef, level: ctx.listLevel }
                : undefined,
            indent: ctx.inBlockquote
              ? { left: convertInchesToTwip(0.5) }
              : undefined,
            border: ctx.inBlockquote
              ? {
                  left: {
                    style: BorderStyle.SINGLE,
                    size: 12,
                    space: 8,
                    color: "CCCCCC",
                  },
                }
              : undefined,
            shading: ctx.inCodeBlock
              ? { type: ShadingType.SOLID, fill: "F8F8F8", color: "auto" }
              : undefined,
          }),
        );
        break;
      }

      case "heading": {
        const level = (node.attrs?.level as number) ?? 1;
        const align = alignment(node.attrs?.textAlign);
        const children = serializeInline(node.content);
        out.push(
          new Paragraph({
            heading: headingLevel(level),
            alignment: align,
            children: children.length ? children : [new TextRun("")],
          }),
        );
        break;
      }

      case "bulletList":
        out.push(...serializeList(node.content, BULLET_REF, ctx.listLevel ?? 0));
        break;

      case "orderedList":
        out.push(
          ...serializeList(node.content, ORDERED_REF, ctx.listLevel ?? 0),
        );
        break;

      case "taskList":
        out.push(...serializeTaskList(node.content, ctx.listLevel ?? 0));
        break;

      case "blockquote":
        out.push(...serializeBlocks(node.content, { inBlockquote: true }));
        break;

      case "codeBlock":
        out.push(...serializeBlocks(node.content, { inCodeBlock: true }));
        break;

      case "horizontalRule":
        out.push(
          new Paragraph({
            children: [new TextRun("")],
            border: {
              bottom: {
                style: BorderStyle.SINGLE,
                size: 6,
                space: 1,
                color: "CCCCCC",
              },
            },
          }),
        );
        break;

      case "pageBreak":
        out.push(new Paragraph({ children: [new DocxPageBreak()] }));
        break;

      default:
        // Generic fallback: recurse into content
        if (node.content) {
          out.push(...serializeBlocks(node.content, ctx));
        }
        break;
    }
  }

  return out;
}

function serializeList(
  items: readonly JSONContent[] | undefined,
  listRef: string,
  level: number,
): Paragraph[] {
  if (!items?.length) return [];
  const out: Paragraph[] = [];

  for (const item of items) {
    if (item.type !== "listItem") continue;

    for (const child of item.content ?? []) {
      if (child.type === "paragraph") {
        const children = serializeInline(child.content);
        out.push(
          new Paragraph({
            children: children.length ? children : [new TextRun("")],
            alignment: alignment(child.attrs?.textAlign),
            numbering: { reference: listRef, level },
          }),
        );
      } else if (child.type === "bulletList") {
        out.push(...serializeList(child.content, BULLET_REF, level + 1));
      } else if (child.type === "orderedList") {
        out.push(...serializeList(child.content, ORDERED_REF, level + 1));
      } else if (child.type === "taskList") {
        out.push(...serializeTaskList(child.content, level + 1));
      }
    }
  }

  return out;
}

function serializeTaskList(
  items: readonly JSONContent[] | undefined,
  level: number,
): Paragraph[] {
  if (!items?.length) return [];
  const out: Paragraph[] = [];

  for (const item of items) {
    if (item.type !== "taskItem") continue;
    const checked = (item.attrs?.checked as boolean) ?? false;
    const prefix = checked ? "☑ " : "☐ ";

    for (const child of item.content ?? []) {
      if (child.type === "paragraph") {
        const inlineChildren = serializeInline(child.content);
        out.push(
          new Paragraph({
            children: [new TextRun(prefix), ...inlineChildren],
            alignment: alignment(child.attrs?.textAlign),
            numbering: { reference: TASK_REF, level },
          }),
        );
      } else if (child.type === "bulletList") {
        out.push(...serializeList(child.content, BULLET_REF, level + 1));
      } else if (child.type === "orderedList") {
        out.push(...serializeList(child.content, ORDERED_REF, level + 1));
      } else if (child.type === "taskList") {
        out.push(...serializeTaskList(child.content, level + 1));
      }
    }
  }

  return out;
}

// ─── numbering config ─────────────────────────────────────────────────────────

function makeNumberingConfig() {
  const INDENT = convertInchesToTwip(0.25);
  const HANGING = convertInchesToTwip(0.25);

  const bulletLevels = [0, 1, 2].map((level) => ({
    level,
    format: LevelFormat.BULLET,
    text: level === 0 ? "•" : level === 1 ? "◦" : "▪",
    alignment: AlignmentType.LEFT,
    style: {
      paragraph: {
        indent: {
          left: INDENT * (level + 1),
          hanging: HANGING,
        },
      },
    },
  }));

  const orderedLevels = [0, 1, 2].map((level) => ({
    level,
    format:
      level === 0
        ? LevelFormat.DECIMAL
        : level === 1
          ? LevelFormat.LOWER_LETTER
          : LevelFormat.LOWER_ROMAN,
    text: `%${level + 1}.`,
    alignment: AlignmentType.LEFT,
    style: {
      paragraph: {
        indent: {
          left: INDENT * (level + 1),
          hanging: HANGING,
        },
      },
    },
  }));

  const taskLevels = [0, 1, 2].map((level) => ({
    level,
    format: LevelFormat.BULLET,
    text: "",
    alignment: AlignmentType.LEFT,
    style: {
      paragraph: {
        indent: {
          left: INDENT * (level + 1),
          hanging: HANGING,
        },
      },
    },
  }));

  return {
    config: [
      { reference: BULLET_REF, levels: bulletLevels },
      { reference: ORDERED_REF, levels: orderedLevels },
      { reference: TASK_REF, levels: taskLevels },
    ],
  };
}

// ─── header / footer builders ─────────────────────────────────────────────────

function buildHeader(text: string): Header {
  return new Header({
    children: [
      new Paragraph({
        children: [new TextRun(text)],
        alignment: AlignmentType.CENTER,
      }),
    ],
  });
}

function buildFooter(text?: string): Footer {
  const children =
    text !== undefined
      ? [new TextRun(text)]
      : [
          new TextRun({
            children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
          }),
        ];

  return new Footer({
    children: [
      new Paragraph({
        children,
        alignment: AlignmentType.CENTER,
      }),
    ],
  });
}

// ─── public API ───────────────────────────────────────────────────────────────

export async function exportToWord(
  json: JSONContent,
  options: WordExportOptions = {},
): Promise<void> {
  const { header, footer, fileName = "document" } = options;

  let docTitle = options.documentTitle;
  if (!docTitle) {
    const firstH1 = json.content?.find(
      (n) => n.type === "heading" && n.attrs?.level === 1,
    );
    if (firstH1?.content) {
      docTitle = firstH1.content.map((n) => n.text ?? "").join("");
    }
  }

  const doc = new Document({
    title: docTitle,
    numbering: makeNumberingConfig(),
    sections: [
      {
        headers: header !== undefined ? { default: buildHeader(header) } : undefined,
        footers:
          footer !== false
            ? {
                default: buildFooter(
                  typeof footer === "string" ? footer : undefined,
                ),
              }
            : undefined,
        children: serializeBlocks(json.content),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
