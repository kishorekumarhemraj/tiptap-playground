import type { AnyExtension, Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import type { AuditLog } from "../drivers/audit-log";
import type { VersionStore } from "../drivers/version-store";
import type {
  SignatureCeremony,
} from "../drivers/signature-ceremony";
import type { CollaborationProviderFactory } from "../drivers/collaboration-provider";
import type { FieldRegistry } from "../drivers/field-registry";
import type { PermissionPolicy, EditorUser } from "./policy";
import type { EditorEventBus } from "./events";

export type { EditorUser } from "./policy";

/**
 * Document lifecycle mode.
 *
 * - `template` — authoring a reusable template. The author defines
 *   the document outline by adding sections, editable fields, and
 *   host-supplied form fields, optionally annotated with instructions
 *   for the end user.
 * - `document` — an instance created from a template. The structure
 *   is frozen: end users cannot add, remove, or reorder blocks
 *   (except inside `mutableContent` sections). Content edits are
 *   confined to `editableField` regions and `field` value changes.
 *
 * The mode flows through `PolicyContext` so the host policy can
 * still override (e.g. an admin role that can mutate structure in
 * document mode). The default policy enforces the contract above.
 */
export type EditorMode = "template" | "document";

/**
 * Drivers supplied by the host. Every privileged concern (auth,
 * persistence, telemetry, signatures, transport, form fields) flows
 * through one of these so the editor stays portable across apps.
 */
export interface EditorDrivers {
  versionStore: VersionStore;
  auditLog: AuditLog;
  signatures?: SignatureCeremony;
  collaboration?: CollaborationProviderFactory;
  /**
   * Registry of host-supplied form fields (selects, dates, custom
   * controls). Optional — templates without `field` nodes don't
   * need it.
   */
  fields?: FieldRegistry;
}

export interface CustomEditorFeatures extends Record<string, unknown> {}
export interface CustomEditorClaims extends Record<string, unknown> {}

/**
 * The full context passed to every extension module. Host apps build
 * this once and hand it to the Editor; extension modules read the
 * slices they care about. Adding new host concerns (e.g. a metadata
 * panel) means adding a field here, not patching every module.
 */
export interface EditorExtensionContext {
  documentId: string;
  user: EditorUser;
  readOnly: boolean;
  /**
   * Template authoring vs. document consumption. Defaults to
   * `document` — the safer assumption for consumers. Template
   * authors explicitly opt in.
   */
  mode: EditorMode;
  /**
   * Per-feature config bag. Feature modules should narrow the type
   * they expect via a type guard so unrelated settings don't leak.
   */
  features: CustomEditorFeatures;
  /** Arbitrary host claims (tenant id, feature flags, document metadata). */
  claims?: CustomEditorClaims;
  drivers: EditorDrivers;
  policy: PermissionPolicy;
  events: EditorEventBus;
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
 * The module contract. Each feature (formatting, locked blocks,
 * collaboration, track changes, versioning, diff view) implements
 * this and contributes TipTap extensions and/or toolbar entries.
 */
export interface EditorExtensionModule {
  id: string;
  name: string;
  description?: string;
  tiptap?: (ctx: EditorExtensionContext) => AnyExtension[];
  toolbar?: (ctx: EditorExtensionContext) => ToolbarItem[];
  enabled?: (ctx: EditorExtensionContext) => boolean;
}
