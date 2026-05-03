# CLAUDE.md — tiptap-playground

This file is the persistent context anchor for AI-assisted development on this repository. Every session should start here.

---

## Product Requirements

The canonical requirements document lives at:

```
docs/requirements.md
```

Always read `docs/requirements.md` before writing any feature code. It defines the full product intent, the persona model (Template Author / Document Author / Contributor / Reviewer), every functional requirement (REQ-TA-*, REQ-DA-*, REQ-CO-*, REQ-CM-*, REQ-AU-*, REQ-VS-*, REQ-EX-*), non-functional requirements, and the requirement-to-implementation coverage map.

**Key things every session must know from that document:**
- There are two lifecycle phases: **Template Authoring** and **Document Authoring + Review**.
- Blocks can be **read-only** or **editable** — this is set by the template author and enforced by `TemplateStructureGuard`.
- Block **instructions** are author-guidance only; they must not appear in exported documents.
- **Track changes** carries user identity (`authorId`, `author`, `changeId`, `timestamp`) on every mark.
- A **Comments** system (REQ-CM-01 to REQ-CM-10) is required and **not yet implemented**.
- **PDF export** (REQ-EX-02) is required and **not yet implemented**.

---

## Repository Layout

```
packages/editor/          — @tiptap-playground/editor (the library, no Next.js)
  src/
    core/                 — types, policy, events, ids, registry
    drivers/              — AuditLog, VersionStore, CollaborationProvider,
                            SignatureCeremony, FieldRegistry
    extensions/           — one folder per TipTap extension module
    react/                — Editor, Toolbar, DragHandle, VersionsPanel, PagesControls

apps/playground/          — Next.js 15 demo wiring the library to localStorage / console
  app/
    editor/               — EditorShell, ModeBanner, PermissionToast, FieldRenderer
    pages-demo/           — PagesShell (Word-like page layout demo)

docs/
  requirements.md         — Canonical product requirements (READ THIS FIRST)
  design-gap.md           — UX gap analysis (open issues with priority)
```

---

## Architecture Principles

1. **Driver injection**: Every privileged concern (auth, persistence, telemetry, transport, form fields, e-signatures) flows through a host-supplied **driver** interface in `packages/editor/src/drivers/`. The editor library never self-owns any of these.

2. **Permission policy gateway**: Every command that modifies document state calls `ctx.policy.<canDoX>(policyContext)` before executing. A denial emits `permission.denied` on the event bus and writes to the audit log. The library never bypasses the policy gate.

3. **Module contract** (`EditorExtensionModule`): Adding a new feature = create `packages/editor/src/extensions/<feature>/index.ts`, export the module, append it to `defaultExtensionModules` in `packages/editor/src/extensions/index.ts`. No other file needs to change.

4. **Mode segregation**: `ctx.mode === "template"` enables structural authoring (drag handles, section controls, block instruction inputs, slash-command palette). `ctx.mode === "document"` freezes structure via `TemplateStructureGuard` and switches all NodeViews to their read-only presentation.

5. **Audit trail**: Every privileged action writes an `AuditEvent` to `ctx.drivers.auditLog`. Never skip this.

6. **No persistence in the library**: `localStorage`, HTTP calls, and websocket transports all live in `apps/playground/` or host apps — never in `packages/editor/`.

---

## Extension Modules (Current State)

| Module | Location | Status | Notes |
|---|---|---|---|
| Core formatting | `extensions/core-formatting` | ✅ Done | StarterKit + marks |
| Section | `extensions/section` | ✅ Done | Title, instruction, mutableContent |
| Editable field | `extensions/editable-field` | ✅ Done | Rich-text editable region |
| Form field | `extensions/field` | ✅ Done | Host-rendered atomic field |
| Template guard | `extensions/template-guard` | ✅ Done | filterTransaction enforcing doc-mode contract |
| Block instruction | `extensions/block-instruction` | ✅ Done | Decoration widget on any block |
| Slash command | `extensions/slash-command` | ✅ Done | `/` palette |
| Collaboration | `extensions/collaboration` | ✅ Done | Yjs + CollaborationCaret |
| Track changes | `extensions/track-changes` | ✅ Done | Insertion/deletion marks, accept/reject, audit |
| Versioning | `extensions/versioning` | ✅ Done | Snapshot/restore/delete |
| Diff view | `extensions/diff-view` | ✅ Done | Side-by-side block diff |
| Pages | `extensions/pages` | ✅ Done | A4 page canvases |
| Word export | `extensions/word-export` | ✅ Done | .docx via `docx` library |
| **Comments** | `extensions/comments` | ❌ **Not implemented** | REQ-CM-01 to REQ-CM-10 |
| **PDF export** | `extensions/pdf-export` | ❌ **Not implemented** | REQ-EX-02 |

---

## Open Design Gaps

See `docs/design-gap.md` for full details. Critical items:

| ID | Issue | Priority |
|---|---|---|
| C1 | Mode-aware UI: no visual distinction between template mode and document mode | P0 |
| C2 | Locked-region feedback: silent failure when clicking read-only blocks | P0 |
| M1 | Permission denials not surfaced to user | P1 |
| M2 | No inline accept/reject on individual tracked changes *(partially resolved by TrackChangesOverlay popover)* | P1 |
| M3 | Version restore has no preview before committing | P1 |
| M4 | PDF export missing | P1 |
| M5 | No floating `+` button for block insertion | P2 |
| m3 | Collaborative presence has no avatar pill UI | P3 |

---

## Key Interfaces to Know

```ts
// Every extension module reads this context
interface EditorExtensionContext {
  documentId: string;
  user: EditorUser;         // { id, name, color, roles }
  readOnly: boolean;
  mode: "template" | "document";
  features: CustomEditorFeatures;
  drivers: {
    versionStore: VersionStore;
    auditLog: AuditLog;
    signatures?: SignatureCeremony;
    collaboration?: CollaborationProviderFactory;
    fields?: FieldRegistry;
  };
  policy: PermissionPolicy;
  events: EditorEventBus;
}

// Track-change mark attributes — must always be set on insertion/deletion marks
interface ChangeAttrs {
  author: string | null;      // display name
  authorId: string | null;    // stable user ID
  timestamp: number | null;   // Unix ms
  changeId: string | null;    // UUID grouping a burst into one logical change
}

// Comment shape (target for Comments extension implementation)
interface CommentAttrs {
  commentId: string;          // UUID
  authorId: string;
  author: string;             // display name
  timestamp: number;          // Unix ms
  resolved: boolean;
  threadId: string;           // groups replies under one thread
}
```

---

## Running the Project

```bash
pnpm install
pnpm run dev          # http://localhost:3000

# Type-check all workspaces
pnpm -r exec tsc --noEmit

# Collaborative editing locally
npx y-websocket
NEXT_PUBLIC_COLLAB_URL=ws://localhost:1234 pnpm run dev
```

---

## Commit Conventions

- `feat(scope):` — new requirement implemented  
- `fix(scope):` — bug fix  
- `design(scope):` — UX / visual change  
- `chore:` — tooling, deps, config  
- Scope examples: `editor`, `track-changes`, `comments`, `pages`, `playground`
