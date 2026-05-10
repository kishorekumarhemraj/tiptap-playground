import { docxBlockMappingForDefaultSchema } from "./blocks";
import { docxInlineContentMappingForDefaultSchema } from "./inlinecontent";
import { docxStyleMappingForDefaultSchema } from "./styles";

export const docxDefaultSchemaMappings = {
  blockMapping: docxBlockMappingForDefaultSchema,
  inlineContentMapping: docxInlineContentMappingForDefaultSchema,
  styleMapping: docxStyleMappingForDefaultSchema,
};
