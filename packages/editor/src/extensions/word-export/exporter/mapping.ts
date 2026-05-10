import type { JSONContent } from "@tiptap/core";
import type { Exporter } from "./Exporter";

export type BlockMapping<RB, RI> = {
  [nodeType: string]: (
    block: JSONContent,
    exporter: Exporter<RB, RI, any, any>,
    nestingLevel: number,
    numberedListIndex?: number,
    children?: Array<Awaited<RB>>
  ) => RB | Promise<RB> | RB[] | Promise<RB[]>;
};

export type InlineContentMapping<RI, TS> = {
  [nodeType: string]: (
    inlineContent: JSONContent,
    exporter: Exporter<any, RI, any, TS>
  ) => RI | RI[];
};

export type StyleMapping<RS> = {
  [markType: string]: (
    styleValue: any,
    exporter: Exporter<any, any, RS, any>
  ) => RS;
};
