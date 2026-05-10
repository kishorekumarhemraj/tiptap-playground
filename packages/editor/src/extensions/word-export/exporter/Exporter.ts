import type { JSONContent } from "@tiptap/core";
import type { BlockMapping, InlineContentMapping, StyleMapping } from "./mapping";

export type ExporterOptions = {
  resolveFileUrl?: (url: string) => Promise<string | Blob>;
  colors?: any;
};

export abstract class Exporter<RB, RI, RS, TS> {
  public constructor(
    protected readonly mappings: {
      blockMapping: BlockMapping<RB, RI>;
      inlineContentMapping: InlineContentMapping<RI, TS>;
      styleMapping: StyleMapping<RS>;
    },
    public readonly options: ExporterOptions
  ) {}

  public async resolveFile(url: string) {
    if (!this.options?.resolveFileUrl) {
      return (await fetch(url)).blob();
    }
    const ret = await this.options.resolveFileUrl(url);
    if (ret instanceof Blob) {
      return ret;
    }
    return (await fetch(ret)).blob();
  }

  public mapStyles(marks: JSONContent[] | undefined): RS[] {
    if (!marks) return [];
    return marks
      .filter((mark) => mark.type && this.mappings.styleMapping[mark.type])
      .map((mark) => this.mappings.styleMapping[mark.type!](mark.attrs || true, this));
  }

  public mapInlineContent(inlineContent: JSONContent): RI | RI[] | null {
    if (inlineContent.type && this.mappings.inlineContentMapping[inlineContent.type]) {
      return this.mappings.inlineContentMapping[inlineContent.type](inlineContent, this);
    }
    return null;
  }

  public transformInlineContent(inlineContentArray: JSONContent[] | undefined): RI[] {
    if (!inlineContentArray) return [];
    const res: RI[] = [];
    for (const ic of inlineContentArray) {
      const mapped = this.mapInlineContent(ic);
      if (mapped !== null) {
        if (Array.isArray(mapped)) res.push(...mapped);
        else res.push(mapped);
      }
    }
    return res;
  }

  public abstract transformStyledText(styledText: JSONContent, hyperlink?: boolean): TS;

  public async mapBlock(
    block: JSONContent,
    nestingLevel: number,
    numberedListIndex: number,
    children?: Array<Awaited<RB>>
  ) {
    if (block.type && this.mappings.blockMapping[block.type]) {
      return this.mappings.blockMapping[block.type](block, this, nestingLevel, numberedListIndex, children);
    }
    return null;
  }
}
