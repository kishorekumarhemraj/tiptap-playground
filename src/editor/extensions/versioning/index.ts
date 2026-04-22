import type { EditorExtensionModule } from "../../types";

/**
 * Versioning stub.
 *
 * Versioning is a host-app concern more than a ProseMirror one: the
 * editor emits snapshots, a store persists them, and the UI lets the
 * user restore or diff. This module is the seam where the editor side
 * of that contract will live - expect it to contribute:
 *
 *   - An `addStorage` block keyed by `versioning` that tracks dirty
 *     state and exposes `snapshot()` / `restore(snapshotId)` helpers.
 *   - A toolbar entry to capture a named version.
 *   - An event the host app can subscribe to (`editor.on('version')`).
 */
export interface VersioningFeatureConfig {
  onSnapshot?: (snapshot: { json: unknown; at: number; by: string }) => void;
}

export const versioningModule: EditorExtensionModule = {
  id: "versioning",
  name: "Versioning",
  description:
    "Captures named snapshots of the document for history, restore, and diff. See src/editor/extensions/versioning for the contract.",
  tiptap: () => [],
};
