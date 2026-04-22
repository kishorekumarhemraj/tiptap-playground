import type { AnyExtension, Editor } from "@tiptap/react";
import type { ReactNode } from "react";

/**
 * Context passed to every extension module when the editor is being
 * assembled. Keeping this broad lets feature modules (collab, track
 * changes, versioning, locking...) read configuration from a single
 * place instead of each hook needing its own wiring.
 */
export interface EditorExtensionContext {
  documentId: string;
  user: EditorUser;
  /** When true, the whole document is rendered in read-only mode. */
  readOnly: boolean;
  /**
   * Per-feature config bag. Feature modules should narrow the type
   * they expect via a type guard so unrelated settings don't leak.
   */
  features: Record<string, unknown>;
}

export interface EditorUser {
  id: string;
  name: string;
  color: string;
}

export type ToolbarItemKind = "button" | "divider" | "dropdown";

export interface ToolbarButton {
  kind: "button";
  id: string;
  label: string;
  icon?: ReactNode;
  title?: string;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
  onRun: (editor: Editor) => void;
}

export interface ToolbarDivider {
  kind: "divider";
  id: string;
}

export interface ToolbarDropdown {
  kind: "dropdown";
  id: string;
  label: string;
  items: Array<{
    id: string;
    label: string;
    onRun: (editor: Editor) => void;
    isActive?: (editor: Editor) => boolean;
  }>;
}

export type ToolbarItem = ToolbarButton | ToolbarDivider | ToolbarDropdown;

/**
 * A single "module" contributed by a feature. Anything a feature needs
 * to plug into the editor (TipTap extensions, toolbar entries, side
 * panels...) flows through this contract so the core never has to know
 * what a feature does - only that it exists.
 */
export interface EditorExtensionModule {
  id: string;
  name: string;
  description?: string;
  /** Extensions this module contributes to the TipTap editor. */
  tiptap?: (ctx: EditorExtensionContext) => AnyExtension[];
  /** Toolbar entries this module contributes. */
  toolbar?: (ctx: EditorExtensionContext) => ToolbarItem[];
  /** Optional flag to disable the module without removing it. */
  enabled?: (ctx: EditorExtensionContext) => boolean;
}
