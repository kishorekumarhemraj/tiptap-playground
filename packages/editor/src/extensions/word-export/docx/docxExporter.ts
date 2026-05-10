import type { JSONContent } from "@tiptap/core";
import {
  AlignmentType,
  Document,
  IRunPropertiesOptions,
  ISectionOptions,
  LevelFormat,
  Packer,
  Paragraph,
  ParagraphChild,
  Tab,
  Table as DocxTable,
  TextRun,
} from "docx";

import { Exporter, ExporterOptions } from "../exporter/Exporter";

// Dummy implementations for missing imports
const COLORS_DEFAULT = {};
const corsProxyResolveFileUrl = async (url: string) => url;
const loadFileBuffer = async (p: any) => undefined;

// get constructor arg type from Document
type DocumentOptions = Partial<ConstructorParameters<typeof Document>[0]>;

const DEFAULT_TAB_STOP =
  /* default font size */ 16 *
  /* 1 pixel is 0.75 points */ 0.75 *
  /* 1.5em*/ 1.5 *
  /* 1 point is 20 twips */ 20;

/**
 * Exports a BlockNote document to a .docx file using the docxjs library.
 */
export class DOCXExporter extends Exporter<
  Promise<Paragraph[] | Paragraph | DocxTable> | Paragraph[] | Paragraph | DocxTable,
  ParagraphChild,
  IRunPropertiesOptions,
  TextRun
> {
  public constructor(
    protected readonly mappings: Exporter<
      Promise<Paragraph[] | Paragraph | DocxTable> | Paragraph[] | Paragraph | DocxTable,
      ParagraphChild,
      IRunPropertiesOptions,
      TextRun
    >["mappings"],
    options?: Partial<ExporterOptions>,
  ) {
    const defaults = {
      colors: COLORS_DEFAULT,
      resolveFileUrl: corsProxyResolveFileUrl,
    } satisfies Partial<ExporterOptions>;

    const newOptions = {
      ...defaults,
      ...options,
    };
    super(mappings, newOptions);
  }

  public transformStyledText(styledText: JSONContent, hyperlink?: boolean) {
    const stylesArray = this.mapStyles(styledText.marks);

    const styles: IRunPropertiesOptions = Object.assign(
      {} as IRunPropertiesOptions,
      ...stylesArray,
    );

    return new TextRun({
      ...styles,
      style: hyperlink ? "Hyperlink" : styles.style,
      text: styledText.text || "",
    });
  }

  public async transformBlocks(
    blocks: JSONContent[] | undefined,
    nestingLevel = 0,
  ): Promise<Array<Paragraph | DocxTable>> {
    const ret: Array<Paragraph | DocxTable> = [];
    if (!blocks) return ret;

    for (const b of blocks) {
      let children = await this.transformBlocks(b.content, nestingLevel + 1);

      if (!["columnList", "column"].includes(b.type!)) {
        children = children.map((c, _i) => {
          // NOTE: nested tables not supported (we can't insert the new Tab before a table)
          if (
            c instanceof Paragraph &&
            !(c as any).properties.numberingReferences.length
          ) {
            c.addRunToFront(
              new TextRun({
                children: [new Tab()],
              }),
            );
          }
          return c;
        });
      }

      const self = await this.mapBlock(
        b as any,
        nestingLevel,
        0 /*unused*/,
        children,
      ); // TODO: any
      if (["columnList", "column"].includes(b.type!)) {
        ret.push(self as DocxTable);
      } else if (Array.isArray(self)) {
        ret.push(...(self as Array<Paragraph | DocxTable>), ...children);
      } else if (self) {
        ret.push(self as Paragraph | DocxTable, ...children);
      } else {
        ret.push(...children);
      }
    }
    return ret;
  }

  protected async getFonts(): Promise<DocumentOptions["fonts"]> {
    return undefined;
  }

  protected async createDefaultDocumentOptions(
    locale?: string,
  ): Promise<DocumentOptions> {
    let externalStyles = (await import("./template/word/stylesXml")).default;

    // Replace the language in styles.xml with the provided locale, or remove
    // the w:lang element entirely if no locale is provided (per ECMA-376
    // §17.3.2.20: omitting w:lang lets the application auto-detect language).
    const trimmedLocale = locale?.trim();
    if (trimmedLocale) {
      externalStyles = externalStyles.replace(
        /(<w:lang\b[^>]*\bw:val=")([^"]+)("[^>]*\/>)/g,
        (_match: any, prefix: any, _oldVal: any, suffix: any) =>
          `${prefix}${trimmedLocale}${suffix}`,
      );
    } else {
      externalStyles = externalStyles.replace(/\s*<w:lang\b[^>]*\/>/g, "");
    }

    const bullets = ["•"]; //, "◦", "▪"]; (these don't look great, just use solid bullet for now)
    return {
      numbering: {
        config: [
          {
            reference: "blocknote-numbered-list",
            levels: Array.from({ length: 9 }, (_, i) => ({
              start: 1,
              level: i,
              format: LevelFormat.DECIMAL,
              text: `%${i + 1}.`,
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: DEFAULT_TAB_STOP * (i + 1),
                    hanging: DEFAULT_TAB_STOP,
                  },
                },
              },
            })),
          },
          {
            reference: "blocknote-bullet-list",
            levels: Array.from({ length: 9 }, (_, i) => ({
              start: 1,
              level: i,
              format: LevelFormat.BULLET,
              text: bullets[i % bullets.length],
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: DEFAULT_TAB_STOP * (i + 1),
                    hanging: DEFAULT_TAB_STOP,
                  },
                },
              },
            })),
          },
        ],
      },
      fonts: await this.getFonts(),
      defaultTabStop: 200,
      externalStyles,
    };
  }

  /**
   * Converts blocks to a .docx Blob with optional locale support.
   */
  public async toBlob(
    blocks: JSONContent[],
    options: {
      sectionOptions: Omit<ISectionOptions, "children">;
      documentOptions: DocumentOptions;
      /**
       * The document locale in OOXML format (e.g. en-US, fr-FR, de-DE).
       * If omitted, no language is set and the consuming application will use its own default.
       */
      locale?: string;
    } = {
      sectionOptions: {},
      documentOptions: {},
    },
  ) {
    const doc = await this.toDocxJsDocument(blocks, options);
    type GlobalThis = typeof globalThis & { Buffer?: any };
    const prevBuffer = (globalThis as GlobalThis).Buffer;
    try {
      if (!(globalThis as GlobalThis).Buffer) {
        // load Buffer polyfill because docxjs requires this
        (globalThis as GlobalThis).Buffer = (
          await import("buffer")
        ).default.Buffer;
      }
      return Packer.toBlob(doc);
    } finally {
      (globalThis as GlobalThis).Buffer = prevBuffer;
    }
  }

  /**
   * Converts blocks to a docxjs Document with optional locale support.
   */
  public async toDocxJsDocument(
    blocks: JSONContent[],
    options: {
      sectionOptions: Omit<ISectionOptions, "children">;
      documentOptions: DocumentOptions;
      /**
       * The document locale in OOXML format (e.g. en-US, fr-FR, de-DE).
       * If omitted, no language is set and the consuming application will use its own default.
       */
      locale?: string;
    } = {
      sectionOptions: {},
      documentOptions: {},
    },
  ) {
    const doc = new Document({
      ...(await this.createDefaultDocumentOptions(options.locale)),
      ...options.documentOptions,
      sections: [
        {
          children: await this.transformBlocks(blocks),
          ...options.sectionOptions,
        },
      ],
    });

    return doc;
  }
}
