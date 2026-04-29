import type { EditorExtensionModule } from "../core/types";
import { coreFormattingModule } from "./core-formatting";
import { sectionModule } from "./section";
import { editableFieldModule } from "./editable-field";
import { fieldModule } from "./field";
import { templateGuardModule } from "./template-guard";
import { blockInstructionModule } from "./block-instruction";
import { slashCommandModule } from "./slash-command";
import { collaborationModule } from "./collaboration";
import { trackChangesModule } from "./track-changes";
import { versioningModule } from "./versioning";
import { diffViewModule } from "./diff-view";
import { wordExportModule } from "./word-export";

/**
 * The canonical module list. Order matters - modules registered earlier
 * win name collisions and render their toolbar entries first. Add new
 * modules by appending to this array (and consider whether existing
 * modules should move relative to them).
 *
 * The drag handle is intentionally NOT in this list — it's a React
 * component (`@tiptap/extension-drag-handle-react`) rendered by the
 * `Editor` component, not a TipTap extension. See `react/Editor.tsx`.
 */
export const defaultExtensionModules: EditorExtensionModule[] = [
  coreFormattingModule,
  sectionModule,
  editableFieldModule,
  fieldModule,
  templateGuardModule,
  blockInstructionModule,
  slashCommandModule,
  collaborationModule,
  trackChangesModule,
  versioningModule,
  diffViewModule,
  wordExportModule,
];

export {
  coreFormattingModule,
  sectionModule,
  editableFieldModule,
  fieldModule,
  templateGuardModule,
  blockInstructionModule,
  slashCommandModule,
  collaborationModule,
  trackChangesModule,
  versioningModule,
  diffViewModule,
  wordExportModule,
};

export {
  TemplateStructureGuard,
  TEMPLATE_GUARD_BYPASS_META,
} from "./template-guard";

export { PageBreakNode, exportToWord } from "./word-export";
export type { WordExportOptions } from "./word-export";

export { PageBreak, Pages, PageKit } from "./pages";
export type { PageFormat, PagesOptions, PagesMargin, PagesStorage, PageKitOptions } from "./pages";

export { PageBreakNode, exportToWord } from "./word-export";
export type { WordExportOptions } from "./word-export";
