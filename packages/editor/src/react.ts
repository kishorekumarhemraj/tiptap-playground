/**
 * React bindings for @tiptap-playground/editor.
 *
 * Each component is a standalone primitive the host app can compose
 * into its own layout. Nothing forces a particular UI shape - the
 * core library doesn't import this module at all.
 */
export { Editor } from "./react/Editor";
export type { EditorProps } from "./react/Editor";

export { Toolbar } from "./react/Toolbar";
export type { ToolbarProps } from "./react/Toolbar";

export { VersionsPanel } from "./react/VersionsPanel";
export type { VersionsPanelProps } from "./react/VersionsPanel";

// The diff surface is a React component but lives with its module so
// the ProseMirror decoration plugin and the component stay together.
export {
  DiffView,
  type DiffViewProps,
  type DiffPaneVersion,
} from "./extensions/diff-view";
