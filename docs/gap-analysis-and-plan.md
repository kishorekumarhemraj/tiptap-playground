# Gap Analysis & Implementation Plan

**Branch**: `feat/requirements-and-gap-plan`  
**Date**: 2026-05-03  
**Reference**: `docs/requirements.md`

This document audits the current codebase against every requirement in `docs/requirements.md` and produces a prioritised implementation plan for the gaps.

---

## 1. Coverage Audit

### Legend
| Symbol | Meaning |
|---|---|
| ✅ | Fully implemented |
| 🟡 | Partially implemented — gap noted |
| ❌ | Not implemented |

---

### 4.1 Template Authoring

| REQ | Description | Status | Gap / Notes |
|---|---|---|---|
| REQ-TA-01 | Add section via `/` slash command or `+` button | 🟡 | Slash command works. **No floating `+` button at block boundaries** (design gap M5). |
| REQ-TA-02 | Section title — inline editable | ✅ | `SectionView` commits on blur. |
| REQ-TA-03 | Section instruction — inline editable | ✅ | `SectionView` instruction input. |
| REQ-TA-04 | Section Mutable / Fixed toggle | ✅ | `mutableContent` attribute toggle in `SectionView`. |
| REQ-TA-05 | Drag handle to reorder sections | ✅ | `DragHandle` (template mode only). |
| REQ-TA-06 | Add any block type via slash command | ✅ | All registered block types appear in `/` palette. |
| REQ-TA-07 | Inline instruction input on any block | 🟡 | `BlockInstruction` adds a global attribute and renders a Decoration widget, but there is **no inline UI for the template author to type that instruction** on non-section blocks. Only `Section` and `EditableField` have inline editing. Paragraphs/headings/lists need a per-block property popover or inline input in template mode. |
| REQ-TA-08 | Inline editable/read-only toggle on any block | 🟡 | `mutableContent` toggle exists on `Section`. **No per-block editable toggle** on paragraphs, headings, etc. — currently everything inside a Fixed section is locked. A per-block override toggle is missing. |
| REQ-TA-09 | Inline controls without leaving editing surface | 🟡 | Sections and editable fields have this. Other block types need a **block-level property bar or popover** surfaced on hover/selection in template mode. |
| REQ-TA-10 | Drag handle visible on all blocks in template mode | ✅ | `DragHandle` wraps all blocks. |
| REQ-TA-11 | Persistent mode badge | ✅ | `ModeBanner` renders clearly in both modes. |
| REQ-TA-12 | Toolbar profiles: template tools only in template mode | 🟡 | Toolbar items check `ctx.mode`, but **template-only items are still visible (disabled) in document mode** (design gap m1). |
| REQ-TA-13 | Template-only items hidden in document toolbar | 🟡 | Same as REQ-TA-12. Filter needed at `Toolbar.tsx` render time. |

---

### 4.2 Document Authoring

| REQ | Description | Status | Gap / Notes |
|---|---|---|---|
| REQ-DA-01 | Paginated A4 page canvases | ✅ | `PageKit` + `PagesPlugin` paginate content. |
| REQ-DA-02 | Content overflows to new pages automatically | ✅ | Overflow detection + `PageBreak` nodes. |
| REQ-DA-03 | Page numbers in footer/margins | ❌ | **Not implemented.** Pages exist but numbers are not rendered. |
| REQ-DA-04 | Clean document surface as-is | ✅ | No structural chrome by default. |
| REQ-DA-05 | Hover reveals editable/read-only and instruction | 🟡 | `SectionView` shows a hover label pill in document mode. **`EditableFieldView` does not show a hover state or instruction on hover** — it only shows the field marker. Block-level instructions are always visible (Decoration widget), not hover-triggered per the requirement. |
| REQ-DA-06 | Locked-region click shows visible feedback | 🟡 | `PermissionToast` fires on `permission.denied` events. However **`TemplateStructureGuard` does not always emit `permission.denied`** — it uses `filterTransaction` which silently drops transactions. Need to pipe denied transactions through the event bus. |
| REQ-DA-07 | Editable regions have hover/focus visual boundary | ✅ | `EditableFieldView.module.css` has focus ring + border. |
| REQ-DA-08 | Instructions shown as info banner above block | 🟡 | Decoration widget renders `💡 instruction` above blocks at all times. Per the requirement, they should be **on hover or as a tooltip**, not always-visible chrome. Need a hover-triggered instruction mode for document view. |
| REQ-DA-09 | Permission denial surfaced as toast | ✅ | `PermissionToast` listens to `permission.denied`. |

---

### 4.3 Real-Time Collaboration

| REQ | Description | Status | Gap / Notes |
|---|---|---|---|
| REQ-CO-01 | Content sync via CRDT (Yjs) | ✅ | `collaborationModule` binds `@tiptap/extension-collaboration`. |
| REQ-CO-02 | Provider-agnostic transport | ✅ | `CollaborationProviderFactory` interface. |
| REQ-CO-03 | Colored cursors per participant | ✅ | `CollaborationCaret` with user color and name. |
| REQ-CO-04 | Avatar pills for active participants in toolbar | ❌ | **Not implemented.** Yjs awareness data is available but no avatar/presence UI exists in `Toolbar.tsx` or `EditorShell`. |
| REQ-CO-05 | Track changes always-on for contributors | 🟡 | Track changes is a manual toggle — **contributors are not automatically put in track-changes mode**. The system needs role-based auto-activation: when `user.roles` contains `"contributor"`, track changes should default to active. |
| REQ-CO-06 | Document author can toggle track changes | ✅ | Policy-gated `toggleTrackChanges` command. |
| REQ-CO-07 | Change popover: author, role, relative timestamp | ✅ | `TrackChangesOverlay` popover with author name, initials avatar, relative timestamp. |
| REQ-CO-08 | Inline accept/reject on individual changes | ✅ | Popover with Accept/Reject buttons per `changeId`. |
| REQ-CO-09 | Bulk Accept All / Reject All | ✅ | Toolbar buttons call `acceptAllChanges` / `rejectAllChanges`. |
| REQ-CO-10 | Role-gated accept/reject (authors vs contributors) | ✅ | `canActOnChange()` enforced in both command and overlay UI. |

---

### 4.4 Comments

| REQ | Description | Status | Gap |
|---|---|---|---|
| REQ-CM-01 | Attach comment to block or text range | ❌ | **Not implemented.** No comments extension exists. |
| REQ-CM-02 | Comment anchor survives document edits | ❌ | Not implemented. |
| REQ-CM-03 | Comment shows author name, avatar, timestamp | ❌ | Not implemented. |
| REQ-CM-04 | Threaded replies | ❌ | Not implemented. |
| REQ-CM-05 | All participants see all comments | ❌ | Not implemented. |
| REQ-CM-06 | Side panel + inline popover display | ❌ | Not implemented. |
| REQ-CM-07 | Document author can resolve a thread | ❌ | Not implemented. |
| REQ-CM-08 | Resolved comments archived, not deleted | ❌ | Not implemented. |
| REQ-CM-09 | Comment actions written to audit log | ❌ | Not implemented. |
| REQ-CM-10 | Comments excluded from Word/PDF export | ❌ | Not implemented (no comments to exclude yet). |

---

### 4.5 Audit Trail

| REQ | Description | Status | Gap |
|---|---|---|---|
| REQ-AU-01 | All privileged actions written to AuditLog | ✅ | Every extension command calls `ctx.drivers.auditLog.record(...)`. |
| REQ-AU-02 | Track-change marks carry identity + timestamp | ✅ | `ChangeAttrs` = `{ author, authorId, changeId, timestamp }`. |
| REQ-AU-03 | Editor only writes to audit log — no audit UI | ✅ | Audit is driver-owned. |
| REQ-AU-04 | Signature proof attached to audit record | ✅ | `SignatureCeremony` driver wired into versioning. |

---

### 4.6 Versioning

| REQ | Description | Status | Gap |
|---|---|---|---|
| REQ-VS-01 | Save named version snapshot | ✅ | Policy-gated `saveVersion` command. |
| REQ-VS-02 | Versions listed in panel | ✅ | `VersionsPanel` component. |
| REQ-VS-03 | Preview diff before restore | ✅ | `restorePreview` state in `EditorShell` wires `DiffView` into the restore flow. |
| REQ-VS-04 | Restore gated by policy + optional signature | ✅ | `policy.canRestoreVersion` + `SignatureCeremony`. |
| REQ-VS-05 | Snapshots stored via `VersionStore` driver | ✅ | Driver interface fulfilled. |

---

### 4.7 Export

| REQ | Description | Status | Gap |
|---|---|---|---|
| REQ-EX-01 | Word (.docx) export | ✅ | `word-export` module + `docx` library serializer. |
| REQ-EX-02 | PDF export | ❌ | **Not implemented.** |
| REQ-EX-03 | Exported docs omit editor-only metadata | 🟡 | Word export omits most metadata. **Instructions and comment anchors** need explicit exclusion once the comments extension exists. |

---

### Non-Functional Requirements

| NFR | Description | Status | Gap |
|---|---|---|---|
| NFR-01 | ARIA roles on sections and locked regions | 🟡 | `ModeBanner` has `role="status"`. **`section` nodes lack `role="region"` + `aria-label`. Locked regions lack `aria-readonly="true"`.** |
| NFR-02 | Track changes: color + secondary indicator | ✅ | `ins` = underline + green; `del` = strikethrough + red. |
| NFR-03 | Slash command keyboard nav | 🟡 | Partially implemented. **Full keyboard accessibility not verified.** |
| NFR-04 | 44×44 px touch targets | 🟡 | **Not audited.** Likely some toolbar buttons and inline controls are below target. |
| NFR-05 | Comment anchors survive CRDT edits | ❌ | Not applicable yet (comments not implemented). |
| NFR-06 | All privileged ops through policy | ✅ | Enforced consistently. |
| NFR-07 | No persistence in library | ✅ | All I/O in playground / host apps. |
| NFR-08 | Provider-agnostic collaboration | ✅ | `CollaborationProviderFactory` abstraction. |

---

## 2. Gap Summary

### Critical Gaps (Blocking Requirements)

| # | Requirement(s) | Gap Description |
|---|---|---|
| G1 | REQ-CM-01 to REQ-CM-10 | **Comments system entirely missing.** Largest unimplemented feature. |
| G2 | REQ-EX-02 | **PDF export not implemented.** |
| G3 | REQ-DA-03 | **Page numbers not rendered** in the pages layout. |
| G4 | REQ-CO-04 | **Collaborative presence avatars** not shown in toolbar/header. |
| G5 | REQ-CO-05 | **Contributors not automatically put in track-changes mode** by role. |

### Moderate Gaps

| # | Requirement(s) | Gap Description |
|---|---|---|
| G6 | REQ-TA-07, REQ-TA-08, REQ-TA-09 | **Per-block property controls** (instruction input, editable toggle) missing for non-section block types in template mode. Only `Section` and `EditableField` have inline property editing. |
| G7 | REQ-TA-01, REQ-TA-06 | **Floating `+` button** at block boundaries missing — slash command is the only discovery path. |
| G8 | REQ-TA-12, REQ-TA-13 | **Toolbar not mode-filtered** — template-only items visible (disabled) in document mode. |
| G9 | REQ-DA-05, REQ-DA-08 | **Block instructions always visible** instead of hover-triggered in document mode. Hover state for editable-field blocks incomplete. |
| G10 | REQ-DA-06 | **`TemplateStructureGuard` does not emit `permission.denied`** on blocked clicks/edits, so `PermissionToast` never fires for locked-region interactions. |

### Minor Gaps

| # | Requirement(s) | Gap Description |
|---|---|---|
| G11 | NFR-01 | Missing `role="region"` + `aria-label` on section nodes; missing `aria-readonly="true"` on locked regions. |
| G12 | NFR-03 | Slash-command keyboard accessibility not fully verified. |
| G13 | NFR-04 | Touch target audit not done. |
| G14 | REQ-EX-03 | Word export exclusion of future comment anchors needs to be planned for. |

---

## 3. Implementation Plan

Tasks are ordered by dependency and impact. Each task has an estimated effort (XS/S/M/L/XL).

---

### Phase 1 — Correctness Fixes (No new features, just making existing ones work per spec)

#### TASK-01 — Wire `TemplateStructureGuard` to emit `permission.denied` [S]

**Gap**: G10 (REQ-DA-06)

`filterTransaction` silently drops blocked transactions. The `PermissionToast` already listens for `permission.denied` but never receives it for locked-region edits.

**Plan**:
1. In `packages/editor/src/extensions/template-guard/TemplateStructureGuard.ts`, replace the bare `filterTransaction` with a `appendTransaction` + `filterTransaction` combo — or switch to a `handleDOMEvents` approach — that calls `ctx.events.emit("permission.denied", { action: "content.edit", reason: "..." })` when a blocked transaction is detected.
2. Since `filterTransaction` runs before we can emit, keep the filter but add a `view.update` side-effect that emits after the blocked transaction is dropped.

**Files**: `extensions/template-guard/TemplateStructureGuard.ts`

---

#### TASK-02 — Mode-filter toolbar items (hide template-only items in document mode) [S]

**Gap**: G8 (REQ-TA-12, REQ-TA-13)

**Plan**:
1. In `packages/editor/src/react/Toolbar.tsx`, filter the items array by checking `ctx.mode` before rendering. Items that are template-only (add section, add editable field, add form field) should not render at all in document mode — not just disabled.
2. Each `EditorExtensionModule.toolbar()` can optionally return `[]` when `ctx.mode !== "template"`. Update the slash-command module and section/field modules to gate their toolbar items by mode.

**Files**: `react/Toolbar.tsx`, `extensions/section/index.ts`, `extensions/editable-field/index.ts`, `extensions/slash-command/index.ts`

---

#### TASK-03 — Contributor role auto-activates track changes [S]

**Gap**: G5 (REQ-CO-05)

**Plan**:
1. In `extensions/track-changes/index.ts`, when building the extension options, check `ctx.user.roles`. If the user has role `"contributor"` (and not `"author"`), set `defaultActive: true`.
2. The `PermissionPolicy` (`canToggleTrackChanges`) should deny toggle for contributors — track changes stays forced-on.
3. Update `defaultPermissionPolicy` in `core/policy.ts` to add this rule.

**Files**: `extensions/track-changes/index.ts`, `core/policy.ts`

---

#### TASK-04 — Page numbers in the pages layout [S]

**Gap**: G3 (REQ-DA-03)

**Plan**:
1. In `extensions/pages/PagesPlugin.ts`, where page break decorations are inserted, also insert a `Decoration.widget` in the page footer area that renders the page number (e.g. `Page N of M`).
2. Alternatively, use CSS `counter` on each page div element if the page structure allows it.

**Files**: `extensions/pages/PagesPlugin.ts`, `extensions/pages/Pages.ts`

---

#### TASK-05 — Hover-triggered instruction display in document mode [M]

**Gap**: G9 (REQ-DA-05, REQ-DA-08)

**Plan**:
1. Modify `BlockInstruction`'s ProseMirror plugin to render instructions as a hover-triggered widget instead of always-visible. Use `view.dom.addEventListener("mouseover", ...)` to detect which block is hovered and conditionally show/hide the instruction decoration.
2. Alternatively: change the Decoration widget to inject a CSS class that makes the instruction visible only on `div:hover .tpe-instruction-widget` — a pure CSS approach with no JS event loop overhead.
3. `EditableFieldView` (document mode) should show its instruction text on hover of the field wrapper, not as a permanent widget.
4. `SectionView` (document mode) already shows a hover label — extend it to include the instruction text inside that pill.

**Files**: `extensions/block-instruction/BlockInstruction.ts`, `extensions/editable-field/EditableFieldView.tsx`

---

#### TASK-06 — ARIA attributes on sections and locked regions [S]

**Gap**: G11 (NFR-01)

**Plan**:
1. In `SectionView.tsx`, add `role="region"` and `aria-label={title ?? "Section"}` to the `NodeViewWrapper`.
2. In `TemplateStructureGuard.ts`, when building decorations for locked blocks, add `aria-readonly="true"` via a `Decoration.node` attribute.
3. Add `aria-readonly="true"` to locked `EditableField` wrappers in document mode.

**Files**: `extensions/section/SectionView.tsx`, `extensions/template-guard/TemplateStructureGuard.ts`, `extensions/editable-field/EditableFieldView.tsx`

---

### Phase 2 — Enhancement (Improving existing features to match spec)

#### TASK-07 — Per-block property bar in template mode [M]

**Gap**: G6 (REQ-TA-07, REQ-TA-08, REQ-TA-09)

Non-section blocks (paragraphs, headings, lists, code blocks) need an inline property popover in template mode to set instruction text and mark the block as editable or read-only.

**Plan**:
1. Create a new React component `BlockPropertyBar` rendered as a floating bar above/beside the currently selected or hovered block in template mode.
2. `BlockPropertyBar` reads `node.attrs.instruction` and a new `node.attrs.readOnly` flag from the `BlockInstruction` extension.
3. Extend `BlockInstruction.addGlobalAttributes()` to also include a `readOnly` boolean attribute on all block types.
4. `TemplateStructureGuard` checks `node.attrs.readOnly` in addition to the section's `mutableContent` flag when filtering transactions in document mode.
5. Wire `BlockPropertyBar` into `Editor.tsx` using `editor.on("selectionUpdate", ...)` to reposition it.

**Files**: New `react/BlockPropertyBar.tsx`, `extensions/block-instruction/BlockInstruction.ts`, `extensions/template-guard/TemplateStructureGuard.ts`, `react/Editor.tsx`

---

#### TASK-08 — Floating `+` button for block insertion [M]

**Gap**: G7 (REQ-TA-01, REQ-TA-06)

**Plan**:
1. Create a `FloatingAddButton` React component that renders a `+` circle button at the left edge of each block line in template mode.
2. The button is positioned via a ProseMirror `Decoration.widget` inserted at each block's start position, or via a `view.update` listener that repositions a floating DOM element.
3. Clicking it triggers the slash-command palette (same as typing `/`): `editor.commands.openSlashCommand()`.
4. Restrict to template mode only.

**Files**: New `react/FloatingAddButton.tsx`, `extensions/slash-command/SlashCommand.ts` (add `openSlashCommand` command), `react/Editor.tsx`

---

#### TASK-09 — Collaborative presence avatar pills [M]

**Gap**: G4 (REQ-CO-04)

**Plan**:
1. Read Yjs awareness state from `provider.awarenessProvider` — use `awareness.getStates()` to get all connected users.
2. Create a `PresenceAvatars` React component that renders colored initials pills in the toolbar header, one per active participant (excluding self).
3. Subscribe to `awareness.on("change", ...)` to update the list reactively.
4. Wire into `EditorShell.tsx` alongside the existing toolbar controls.

**Files**: New `react/PresenceAvatars.tsx`, `apps/playground/app/editor/EditorShell.tsx`

---

### Phase 3 — New Features

#### TASK-10 — Comments Extension [XL]

**Gap**: G1 (REQ-CM-01 to REQ-CM-10) — **Largest new feature**

**Architecture**:

Comments are separate from tracked changes. They annotate content without altering it.

```
Comment data model:
  commentId: string (UUID)
  threadId:  string (UUID) — root comment ID groups replies
  authorId:  string
  author:    string (display name)
  timestamp: number (Unix ms)
  text:      string
  resolved:  boolean
  anchor:    { from: number, to: number } | { nodeId: string }
```

**Storage**: Comments live outside the ProseMirror document. They are stored in a host-supplied driver (add `CommentStore` to `EditorDrivers`). In the playground, use `localStorage`. In real apps, the host wires an HTTP API.

**ProseMirror integration**:
1. Add a `comment` Mark that annotates a text range with `commentId` (the mark only carries the anchor ID, not the comment data itself — data lives in the store).
2. When a comment is added, wrap the selected range in the `comment` mark. If anchoring to a block (not a range), use the block's `id` attribute.
3. Use Yjs awareness or the collaboration layer to sync comment additions across peers in real time (emit via the `CollaborationProvider`'s Y.Doc awareness, or use a separate awareness channel).

**UI**:
1. `CommentsSidePanel` — a side panel component that lists all comment threads for the document, grouped by anchor. Shows author, timestamp, text, and replies. Document author sees a "Resolve" button.
2. `CommentPopover` — appears when clicking on a `comment` mark in the document. Shows the thread inline. Has a reply input.
3. `AddCommentButton` — appears in the floating toolbar when text is selected (in document mode, for contributors and reviewers).
4. Resolved threads are visually collapsed but accessible via "Show resolved" toggle.

**Audit**:
- `comment.added`, `comment.replied`, `comment.resolved` emitted on `EditorEventBus` and written to `AuditLog`.

**Driver interface** (add to `packages/editor/src/drivers/`):
```ts
interface CommentStore {
  list(documentId: string): CommentThread[] | Promise<CommentThread[]>;
  add(thread: CommentThread): void | Promise<void>;
  reply(threadId: string, reply: CommentReply): void | Promise<void>;
  resolve(threadId: string): void | Promise<void>;
  subscribe?(listener: () => void): () => void;
}
```

**Implementation steps**:
1. Add `CommentStore` driver interface (`drivers/comment-store.ts`)
2. Add `comment` Mark to `extensions/comments/marks.ts`
3. Build `extensions/comments/Comments.ts` (Extension with addMark command, addProseMirrorPlugins for anchor decorations)
4. Build `react/CommentsPanel.tsx` (side panel)
5. Build `react/CommentPopover.tsx` (inline thread viewer/replier)
6. Build `react/AddCommentButton.tsx` (floating on selection)
7. Add `commentsModule` to `defaultExtensionModules`
8. Add `commentStore` to `EditorDrivers` (optional, gated by `enabled`)
9. Wire playground localStorage comment store in `apps/playground/app/editor/drivers.ts`
10. Update `word-export` serializer to strip `comment` marks (REQ-EX-03 / REQ-CM-10)

**Files**: Many new files, plus: `core/types.ts`, `drivers/index.ts`, `extensions/index.ts`, `react/Editor.tsx`, `extensions/word-export/serializer.ts`

---

#### TASK-11 — PDF Export [L]

**Gap**: G2 (REQ-EX-02)

**Plan** (client-side approach for the playground; server-side recommended for production):

1. Create `extensions/pdf-export/index.ts` as a new module.
2. Use `@react-pdf/renderer` (or `html2pdf.js` as a simpler fallback) to convert the editor's current HTML to a PDF blob.
3. Toolbar button "↓ PDF" triggers `exportPdf` command.
4. The serializer must strip: instruction widgets, comment mark spans, editable-field wrappers, track-change marks (accept all first or strip pending marks).
5. For production use, add a note in the README recommending server-side PDF (Puppeteer/Playwright) for regulated environments that need pixel-perfect fidelity and digital signature embedding.

**Files**: New `extensions/pdf-export/`, `extensions/index.ts`

---

## 4. Recommended Sequencing

```
Sprint 1 (Correctness)
  TASK-01  Wire permission.denied from TemplateStructureGuard
  TASK-02  Mode-filter toolbar
  TASK-03  Contributor auto-enables track changes
  TASK-06  ARIA attributes

Sprint 2 (Document Experience)
  TASK-04  Page numbers
  TASK-05  Hover-triggered instructions
  TASK-07  Per-block property bar (template mode)

Sprint 3 (Collaboration UX)
  TASK-08  Floating + button
  TASK-09  Presence avatar pills

Sprint 4 (Comments — major feature)
  TASK-10  Comments extension (all sub-tasks)

Sprint 5 (Export)
  TASK-11  PDF export
```

---

## 5. Files to Create (Net New)

```
packages/editor/src/
  drivers/comment-store.ts
  extensions/comments/
    Comments.ts
    marks.ts
    index.ts
    CommentsPanel.module.css    (if React NodeView)
  extensions/pdf-export/
    index.ts
    serializer.ts
  react/
    BlockPropertyBar.tsx
    BlockPropertyBar.module.css
    FloatingAddButton.tsx
    FloatingAddButton.module.css
    PresenceAvatars.tsx
    PresenceAvatars.module.css
    CommentsPanel.tsx
    CommentsPanel.module.css
    CommentPopover.tsx
    CommentPopover.module.css
    AddCommentButton.tsx
    AddCommentButton.module.css
```
