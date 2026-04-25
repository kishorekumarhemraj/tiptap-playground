import type { EditorExtensionModule } from "../core/types";
import { coreFormattingModule } from "./core-formatting";
import { sectionModule } from "./section";
import { editableFieldModule } from "./editable-field";
import { fieldModule } from "./field";
import { blockInstructionModule } from "./block-instruction";
import { blockHandleModule } from "./block-handle";
import { slashCommandModule } from "./slash-command";
import { collaborationModule } from "./collaboration";
import { trackChangesModule } from "./track-changes";
import { versioningModule } from "./versioning";
import { diffViewModule } from "./diff-view";

/**
 * The canonical module list. Order matters - modules registered earlier
 * win name collisions and render their toolbar entries first. Add new
 * modules by appending to this array (and consider whether existing
 * modules should move relative to them).
 */
export const defaultExtensionModules: EditorExtensionModule[] = [
  coreFormattingModule,
  sectionModule,
  editableFieldModule,
  fieldModule,
  blockInstructionModule,
  blockHandleModule,
  slashCommandModule,
  collaborationModule,
  trackChangesModule,
  versioningModule,
  diffViewModule,
];

export {
  coreFormattingModule,
  sectionModule,
  editableFieldModule,
  fieldModule,
  blockInstructionModule,
  blockHandleModule,
  slashCommandModule,
  collaborationModule,
  trackChangesModule,
  versioningModule,
  diffViewModule,
};
