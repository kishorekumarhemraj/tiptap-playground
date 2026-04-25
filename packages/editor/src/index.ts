/**
 * @tiptap-playground/editor
 *
 * Notion-style TipTap editor with a driver-injected core. Designed
 * for regulated document-management use cases: every privileged
 * operation (edit, lock, accept/reject change, save/restore version)
 * funnels through the host-supplied `PermissionPolicy`, emits typed
 * events, and writes to the host-supplied `AuditLog`.
 *
 * Entrypoints:
 *   `@tiptap-playground/editor`            core + extensions + drivers
 *   `@tiptap-playground/editor/react`      React bindings (Editor, Toolbar, ...)
 *   `@tiptap-playground/editor/drivers`    driver interfaces + defaults
 *   `@tiptap-playground/editor/extensions` extension modules
 */
export type {
  EditorExtensionContext,
  EditorExtensionModule,
  EditorDrivers,
  EditorMode,
  ToolbarItem,
  ToolbarButton,
  ToolbarDivider,
  ToolbarDropdown,
  ToolbarItemKind,
  EditorUser,
} from "./core/types";
export {
  buildTiptapExtensions,
  buildToolbarItems,
} from "./core/registry";

export type {
  EditorEventBus,
  EditorEventMap,
  EditorEventName,
  EditorEventListener,
  Unsubscribe,
} from "./core/events";
export { createEventBus } from "./core/events";

export type {
  PermissionPolicy,
  PolicyContext,
  PolicyDecision,
  BlockDescriptor,
  FieldDescriptor,
} from "./core/policy";
export { defaultPermissionPolicy } from "./core/policy";

export * from "./drivers";
export * from "./extensions";
