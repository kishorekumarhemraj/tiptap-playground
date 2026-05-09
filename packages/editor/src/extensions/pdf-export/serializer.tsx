/**
 * PDF serializer for TipTap documents.
 *
 * Converts the editor's JSON representation (via editor.getJSON()) into a
 * react-pdf Document tree, then blobs it for browser download.
 *
 * This module is dynamically imported so @react-pdf/renderer is only loaded
 * when the user actually triggers a PDF export, keeping the initial bundle lean.
 */

import type { JSONContent } from "@tiptap/core";

export interface PDFExportOptions {
  fileName?: string;
  title?: string;
  /** Optional header text shown on every page */
  header?: string;
  /** Optional footer text — defaults to page numbers if omitted */
  footer?: string | false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PT = 0.75; // 1 CSS px ≈ 0.75 pt

function collectText(nodes: JSONContent[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((n) => {
      if (n.type === "text") return n.text ?? "";
      if (n.content) return collectText(n.content);
      return "";
    })
    .join("");
}

// ─── Serializer ───────────────────────────────────────────────────────────────

/**
 * Main entry point — call from a click handler.
 * Lazily imports react-pdf so it is tree-shaken from the core bundle.
 */
export async function exportToPDF(
  json: JSONContent,
  options: PDFExportOptions = {},
): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const doc = buildDocument(json, options);
  const blob = await pdf(doc).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${options.fileName ?? "document"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Document builder ─────────────────────────────────────────────────────────

function buildDocument(json: JSONContent, options: PDFExportOptions) {
  // We use require-style dynamic import inside the function — this file is
  // only ever called after the lazy import above resolves, so react-pdf's
  // components are guaranteed to be available via the module cache.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    Document,
    Page,
    View,
    Text,
    StyleSheet,
    Font,
  } = require("@react-pdf/renderer");

  // Register system fonts (Inter subset via Google Fonts data URI won't work
  // in all environments — use a safe built-in approach instead).
  // react-pdf ships Helvetica by default; use that for reliability.
  const styles = StyleSheet.create({
    page: {
      paddingTop: 40,
      paddingBottom: 60,
      paddingHorizontal: 50,
      fontSize: 11,
      lineHeight: 1.6,
      fontFamily: "Helvetica",
      color: "#1a1a1a",
    },
    header: {
      fontSize: 9,
      color: "#6b7280",
      textAlign: "center",
      marginBottom: 16,
      borderBottom: "1 solid #e5e7eb",
      paddingBottom: 6,
    },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 50,
      right: 50,
      fontSize: 9,
      color: "#9ca3af",
      textAlign: "center",
    },
    h1: { fontSize: 22 * PT, fontFamily: "Helvetica-Bold", marginBottom: 8, marginTop: 12 },
    h2: { fontSize: 18 * PT, fontFamily: "Helvetica-Bold", marginBottom: 6, marginTop: 10 },
    h3: { fontSize: 15 * PT, fontFamily: "Helvetica-Bold", marginBottom: 4, marginTop: 8 },
    p: { marginBottom: 6 },
    listItem: { flexDirection: "row", marginBottom: 3 },
    listBullet: { width: 14, color: "#6b7280" },
    listContent: { flex: 1 },
    blockquote: {
      borderLeft: "3 solid #d1d5db",
      paddingLeft: 10,
      color: "#6b7280",
      marginBottom: 6,
      fontFamily: "Helvetica-Oblique",
    },
    code: {
      fontFamily: "Courier",
      fontSize: 9,
      backgroundColor: "#f3f4f6",
      padding: 8,
      marginBottom: 6,
      borderRadius: 3,
    },
    hr: {
      borderBottom: "1 solid #d1d5db",
      marginVertical: 10,
    },
    columnList: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 6,
    },
    column: {
      flex: 1,
    },
  });

  const blocks = renderBlocks(json.content ?? [], { styles, numbered: 0 });

  return (
    <Document title={options.title}>
      <Page size="A4" style={styles.page}>
        {options.header && (
          <View style={styles.header} fixed>
            <Text>{options.header}</Text>
          </View>
        )}
        {blocks}
        {options.footer !== false && (
          <View style={styles.footer} fixed>
            <Text>
              {typeof options.footer === "string"
                ? options.footer
                : "Page {pageNumber} of {totalPages}"}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

// ─── Block renderer ───────────────────────────────────────────────────────────

interface RenderCtx {
  styles: Record<string, any>;
  numbered: number;
  inBlockquote?: boolean;
  inCode?: boolean;
  nestLevel?: number;
}

function renderBlocks(
  nodes: JSONContent[],
  ctx: RenderCtx,
): React.ReactElement[] {
  // We lazily require here too so the closure works after dynamic import
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require("@react-pdf/renderer");

  const out: React.ReactElement[] = [];
  let numberedIndex = 0;

  for (const node of nodes) {
    if (node.type === "orderedList") {
      numberedIndex++;
    } else {
      numberedIndex = 0;
    }

    switch (node.type) {
      case "paragraph": {
        const baseStyle = ctx.inBlockquote ? ctx.styles.blockquote : ctx.styles.p;
        out.push(
          <View key={out.length} style={baseStyle}>
            {renderInline(node.content ?? [], ctx)}
          </View>,
        );
        break;
      }

      case "heading": {
        const level = (node.attrs?.level as number) ?? 1;
        const headingStyle =
          level === 1
            ? ctx.styles.h1
            : level === 2
              ? ctx.styles.h2
              : ctx.styles.h3;
        out.push(
          <View key={out.length} style={headingStyle}>
            {renderInline(node.content ?? [], ctx)}
          </View>,
        );
        break;
      }

      case "bulletList":
        out.push(
          ...renderList(node.content ?? [], ctx, "bullet"),
        );
        break;

      case "orderedList":
        out.push(
          ...renderList(node.content ?? [], ctx, "ordered"),
        );
        break;

      case "taskList":
        out.push(
          ...renderList(node.content ?? [], ctx, "task"),
        );
        break;

      case "blockquote":
        out.push(
          ...renderBlocks(node.content ?? [], {
            ...ctx,
            inBlockquote: true,
          }),
        );
        break;

      case "codeBlock": {
        const codeText = collectText(node.content);
        out.push(
          <View key={out.length} style={ctx.styles.code}>
            <Text>{codeText}</Text>
          </View>,
        );
        break;
      }

      case "horizontalRule":
        out.push(<View key={out.length} style={ctx.styles.hr} />);
        break;

      case "columnList":
        out.push(
          <View key={out.length} style={ctx.styles.columnList}>
            {(node.content ?? []).map((col, i) => (
              <View
                key={i}
                style={{ ...ctx.styles.column, flexGrow: (col.attrs?.width as number) ?? 1 }}
              >
                {renderBlocks(col.content ?? [], ctx)}
              </View>
            ))}
          </View>,
        );
        break;

      default:
        if (node.content) {
          out.push(...renderBlocks(node.content, ctx));
        }
    }
  }

  return out;
}

// ─── List renderer ────────────────────────────────────────────────────────────

function renderList(
  items: JSONContent[],
  ctx: RenderCtx,
  kind: "bullet" | "ordered" | "task",
): React.ReactElement[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require("@react-pdf/renderer");
  const out: React.ReactElement[] = [];
  let index = 0;

  for (const item of items) {
    index++;
    const itemType = kind === "task" ? "taskItem" : "listItem";
    if (item.type !== itemType) continue;

    const bullet =
      kind === "bullet"
        ? "• "
        : kind === "ordered"
          ? `${index}. `
          : (item.attrs?.checked as boolean)
            ? "☑ "
            : "☐ ";

    const nestLevel = (ctx.nestLevel ?? 0);
    const paddingLeft = nestLevel * 12;

    out.push(
      <View
        key={out.length}
        style={{ ...ctx.styles.listItem, paddingLeft }}
      >
        <Text style={ctx.styles.listBullet}>{bullet}</Text>
        <View style={ctx.styles.listContent}>
          {renderBlocks(item.content ?? [], ctx)}
        </View>
      </View>,
    );
  }

  return out;
}

// ─── Inline renderer ──────────────────────────────────────────────────────────

function renderInline(
  nodes: JSONContent[],
  ctx: RenderCtx,
): React.ReactElement {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text, Link } = require("@react-pdf/renderer");

  const runs = nodes.map((node, i) => {
    if (node.type === "hardBreak") return <Text key={i}>{"\n"}</Text>;
    if (node.type !== "text") return null;

    const text = node.text ?? "";
    const marks: JSONContent[] = node.marks ?? [];

    let bold = false;
    let italic = false;
    let underline = false;
    let strike = false;
    let code = false;
    let href: string | undefined;

    for (const m of marks) {
      if (m.type === "bold") bold = true;
      if (m.type === "italic") italic = true;
      if (m.type === "underline") underline = true;
      if (m.type === "strike") strike = true;
      if (m.type === "code") code = true;
      if (m.type === "link") href = m.attrs?.href as string;
    }

    const style: Record<string, any> = {};
    if (bold && italic)
      style.fontFamily = "Helvetica-BoldOblique";
    else if (bold)
      style.fontFamily = "Helvetica-Bold";
    else if (italic)
      style.fontFamily = "Helvetica-Oblique";
    if (code) {
      style.fontFamily = "Courier";
      style.fontSize = 9;
      style.backgroundColor = "#f3f4f6";
    }
    if (underline) style.textDecoration = "underline";
    if (strike) style.textDecoration = strike && underline ? "underline line-through" : "line-through";

    const el = <Text key={i} style={style}>{text}</Text>;
    return href ? <Link key={i} src={href}>{el}</Link> : el;
  });

  return <Text>{runs}</Text>;
}
