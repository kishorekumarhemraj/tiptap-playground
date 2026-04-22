import type { EditorExtensionModule } from "../types";
import { coreFormattingModule } from "./core-formatting";
import { lockedBlockModule } from "./locked-block";
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
  lockedBlockModule,
  collaborationModule,
  trackChangesModule,
  versioningModule,
  diffViewModule,
];

export {
  coreFormattingModule,
  lockedBlockModule,
  collaborationModule,
  trackChangesModule,
  versioningModule,
  diffViewModule,
};
