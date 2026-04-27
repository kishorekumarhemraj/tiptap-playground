# tiptap-playground

A **template-based** TipTap editor for regulated document-management use cases, built as an embeddable library.

A super-user authors a **template** — a document outline made of sections, free-form editable regions, and inline form fields. End users open a **document** instantiated from that template; the structure is frozen and they can only fill in the editable regions and field values. Every privileged operation flows through host-supplied drivers and a `PermissionPolicy`.

- `packages/editor/` — `@tiptap-playground/editor`, the library. Drivers: `VersionStore`, `AuditLog`, `CollaborationProvider`, `SignatureCeremony`, `FieldRegistry`. No Next.js inside.
- `apps/playground/` — a Next.js 15 / Turbopack demo that wires the library to localStorage, console audit, an in-memory field registry (with a host-supplied `renderField` for selects, dates, etc.), and an optional y-websocket collaboration provider.

```bash
npm install
npm run dev        # http://localhost:3000 (Next + Turbopack)
npm run build
npm run typecheck  # root + every workspace
```

## Library at a glance

```ts
import {
  defaultExtensionModules,
  defaultPermissionPolicy,
  createEventBus,
  localStorageVersionStore,
  consoleAuditLog,
  type EditorExtensionContext,
} from "@tiptap-playground/editor";
import { Editor } from "@tiptap-playground/editor/react";

const context: EditorExtensionContext = {
  documentId: "DOC-0001",
  user: { id: currentUser.id, name: currentUser.name, color: "#2383e2", roles: currentUser.roles },
  readOnly: false,
  mode: isAuthor ? "template" : "document",
  features: {},
  drivers: {
    versionStore: myHttpVersionStore("DOC-0001"),
    auditLog: mySiemAuditSink(),
    collaboration: myHocuspocusFactory(),
    signatures: myCeremony(),         // e.g. Okta step-up / HSM
    fields: myFieldRegistry(),        // your form-field defs + render(...)
  },
  policy: myPermissionPolicy,
  events: createEventBus(),
};

<Editor modules={defaultExtensionModules} context={context} />
```

## Why this shape

Regulated DMS rollouts (life-sciences SOPs, contract lifecycle, banking policy docs, clinical trial protocols) share four concerns that don't belong in a rich-text library:

1. **Identity & authz** are owned by the host.
2. **Persistence** is owned by the host (with audit + retention rules).
3. **Telemetry / audit log** is owned by the host (21 CFR Part 11, SOX, ISO 27001).
4. **e-Signatures** are owned by the host (Okta, HSM, DocuSign, etc).

The library exposes one seam per concern — a *driver* — and every privileged operation (modify a section's structure, fill an editable region, change a field value, accept a change, save a version…) funnels through the host-supplied `PermissionPolicy` before it runs, emitting a typed event on success and an audit record on both success and denial.

## The contract

Everything in `packages/editor/src`:

```
core/
  types.ts       EditorExtensionContext, EditorExtensionModule, ToolbarItem
  registry.ts    Flattens modules into a single TipTap extensions + toolbar set
  events.ts      EditorEventBus (typed event names + payloads)
  policy.ts      PermissionPolicy interface + defaultPermissionPolicy()
drivers/
  version-store.ts           VersionStore (memory + localStorage defaults)
  audit-log.ts               AuditLog (memory + console defaults)
  signature-ceremony.ts      SignatureCeremony (noop default)
  collaboration-provider.ts  CollaborationProvider (Yjs-facing)
  field-registry.ts          FieldRegistry (host-supplied form fields + LOVs)
extensions/
  core-formatting/   StarterKit + Notion-ish marks
  section/           Section container node (title, instruction, mutableContent)
  editable-field/    Free-form rich-text region the end user fills in
  field/             Inline atomic node embedding a host-rendered form control
  template-guard/    filterTransaction plugin enforcing the document-mode contract
  block-instruction/ Optional one-line guidance attached to any block
  slash-command/     `/` palette; in template mode lists registered fields too
  collaboration/     Binds host Y.Doc + awareness provider
  track-changes/     Insertion/Deletion marks; accept/reject through policy
  versioning/        Snapshot / restore / delete through policy + audit
  diff-view/         Block-level diff + read-only side-by-side component
react/
  Editor.tsx         Top-level component; calls onEditor() with the TipTap instance
  Toolbar.tsx        Stateless renderer for ToolbarItem[]
  DragHandle.tsx     Wrapper around @tiptap/extension-drag-handle-react (template only)
  VersionsPanel.tsx  Lists + restore/delete + 2-way compare
```

The **module contract** (`EditorExtensionModule`) is:

```ts
interface EditorExtensionModule {
  id: string;
  name: string;
  tiptap?: (ctx) => AnyExtension[];
  toolbar?: (ctx) => ToolbarItem[];
  enabled?: (ctx) => boolean;
}
```

Adding a new extension = create `packages/editor/src/extensions/<feature>/index.ts`, export the module, append it to `defaultExtensionModules`. The module reads `ctx.drivers` / `ctx.policy` / `ctx.events` like every other module. Nothing else changes.

## Driver interfaces

### PermissionPolicy

Every privileged action checks one of:

```ts
canEditDocument, canModifyStructure, canFillField, canChangeFieldValue,
canToggleTrackChanges, canAcceptChanges, canRejectChanges,
canSaveVersion, canRestoreVersion, canDeleteVersion, evaluateCondition
```

Each returns `{ allowed, reason?, requiresSignature? }`. A denial short-circuits the command, emits `permission.denied`, and the audit log sees it.

### VersionStore

```ts
interface VersionStore {
  list(): VersionSnapshot[] | Promise<VersionSnapshot[]>;
  get(id): VersionSnapshot | null | Promise<...>;
  put(s): void | Promise<void>;
  remove(id): void | Promise<void>;
  subscribe?(listener): () => void;
}
```

Implement against your DMS API. The `subscribe` hook lets HTTP-backed stores push updates into live UI.

### AuditLog

```ts
interface AuditLog {
  record(event: AuditEvent): void | Promise<void>;
  list?(opts?): AuditEvent[] | Promise<AuditEvent[]>;
}
```

Every event carries actor, timestamp, summary, and — if a signature was collected — the `Signature` proof.

### CollaborationProvider

```ts
type CollaborationProviderFactory = (args: { documentId }) => {
  ydoc: Y.Doc;
  awarenessProvider?: unknown;
  destroy?(): void;
};
```

Hook up `@hocuspocus/provider`, `y-websocket`, or TipTap Cloud — the module stays provider-agnostic.

### SignatureCeremony

```ts
interface SignatureCeremony {
  sign(request): Promise<Signature | null>;
}
```

Returns a `Signature { signerId, signerName, at, reason, method, proof }`. The library stores the signature alongside the version snapshot and in the audit record.

### FieldRegistry

```ts
interface FieldRegistry {
  get(id: string): FieldDefinition | null | Promise<...>;
  list(): FieldDefinition[] | Promise<...>;
  render?(props: FieldRenderProps): ReactNode;
  subscribe?(listener: () => void): () => void;
}
```

The host owns field definitions (id, kind, label, options/LOVs, validation) and the `render` function. The library's `field` node carries only routing state (`id`, `fieldId`, `value`); at render time the NodeView calls `registry.render(...)` so the host's UI kit, theming, and validation flow naturally.

## Events

Typed event bus (`EditorEventBus`). Names + payloads live in `EditorEventMap`:

```
editor.ready        editor.destroy
version.saved       version.restored       version.deleted
change.tracking.toggled                change.accepted   change.rejected
field.value.changed
document.changed
permission.denied
```

Hosts subscribe via `context.events.on(name, listener)` and feed the stream into whatever they use for telemetry / workflow / notifications.

## Extensions shipped

| Module | Status | Notes |
|---|---|---|
| Core formatting | implemented | StarterKit + Highlight / TextAlign / Typography / TaskList / Subscript / Superscript / CharacterCount / Placeholder |
| Section | implemented | Block container with `title`, `instruction`, `mutableContent` flag. Frame is immovable in document mode. |
| Editable field | implemented | Wrapper marking a free-form rich-text region the end user fills in. |
| Field | implemented | Inline atomic node; the host's `FieldRegistry.render(...)` produces the actual control. |
| Template structure guard | implemented | filterTransaction plugin enforcing the document-mode contract. Bypassable via `tr.setMeta(TEMPLATE_GUARD_BYPASS_META, true)` for privileged library operations. |
| Block instruction | implemented | Optional one-line author guidance shown above any block. |
| Slash command | implemented | `/` palette. In template mode lists every registered `FieldDefinition` so authors can drop fields into the document. |
| Drag handle | implemented (React) | Wraps `@tiptap/extension-drag-handle-react`; rendered only in template mode. |
| Collaborative editing | implemented | Binds `@tiptap/extension-collaboration` + `CollaborationCaret` to a host-supplied provider. |
| Track changes | implemented | Insertion/deletion marks + accept/reject; toggle gated on `policy.canToggleTrackChanges`. |
| Versioning | implemented | Snapshot / restore / delete through `VersionStore`; each command writes to `AuditLog`, emits events, and optionally collects a signature. |
| Side-by-side diff | implemented | `DiffView` mounts two read-only editors with the same module pipeline and runs a block-level diff via a ProseMirror Decorations plugin. |

## Running collaborative editing locally

```bash
npx y-websocket   # starts ws://localhost:1234
NEXT_PUBLIC_COLLAB_URL=ws://localhost:1234 npm run dev
```

Open the page in two tabs — edits sync over the websocket and remote selections appear as colored carets.
