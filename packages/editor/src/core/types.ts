import type { AnyExtension, Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import type { AuditLog } from "../drivers/audit-log";
import type { VersionStore } from "../drivers/version-store";
import type {
  SignatureCeremony,
} from "../drivers/signature-ceremony";
import type { CollaborationProviderFactory } from "../drivers/collaboration-provider";
import type { PermissionPolicy, EditorUser } from "./policy";
import type { EditorEventBus } from "./events";

export type { EditorUser } from "./policy";

/**
 * Drivers supplied by the host. Every privileged concern (auth,
 * persistence, telemetry, signatures, transport) flows through one
 * of these so the editor stays portable across apps.
 */
export interface EditorDrivers {
  versionStore: VersionStore;
  auditLog: AuditLog;
  signatures?: SignatureCeremony;
  collaboration?: CollaborationProviderFactory;
}

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
   * Per-feature config bag. Feature modules should narrow the type
   * they expect via a type guard so unrelated settings don't leak.
   */
  features: Record<string, unknown>;
  /** Arbitrary host claims (tenant id, feature flags, document metadata). */
  claims?: Record<string, unknown>;
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
