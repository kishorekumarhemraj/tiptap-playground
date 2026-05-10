import { IRunPropertiesOptions, ShadingType } from "docx";
import type { StyleMapping } from "../../exporter/mapping";

export const docxStyleMappingForDefaultSchema: StyleMapping<IRunPropertiesOptions> = {
  bold: (val) => val ? { bold: true } : {},
  italic: (val) => val ? { italics: true } : {},
  underline: (val) => val ? { underline: { type: "single" } } : {},
  strike: (val) => val ? { strike: true } : {},
  textStyle: (val) => val?.color ? { color: val.color.replace("#", "") } : {},
  highlight: (val) => val?.color ? { shading: { type: ShadingType.CLEAR, fill: val.color.replace("#", "") } } : {},
  code: (val) => val ? { style: "VerbatimChar" } : {},
};
