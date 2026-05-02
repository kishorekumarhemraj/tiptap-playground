# Block-Based Editor — Product Requirements

**Version**: 1.0  
**Date**: 2026-05-03  
**Status**: Baseline

---

## 1. System Overview

A template-driven, block-based rich-text editor built on top of TipTap/ProseMirror. The system serves three distinct personas operating across two lifecycle phases:

```
Phase 1 — Template Authoring
  Actor: Template Author
  Goal: Define the document structure (sections, blocks, instructions, editability)

Phase 2 — Document Authoring & Review
  Actors: Document Author, Contributors, Reviewers
  Goal: Fill in content, collaborate in real time, review and comment
```

The editor must feel like Microsoft Word in document mode — familiar page-based layout, clean document surface — while exposing a modern, structured authoring canvas in template mode.

---

## 2. Personas

| Persona | Role | Key Capabilities |
|---|---|---|
| **Template Author** | Designs the document structure | Add sections, add blocks, set instructions, mark blocks as editable or read-only |
| **Document Author** | Owns the document instance | Fill editable content, accept/reject contributor changes, see all comments |
| **Contributor** | Collaborates on the document | Edit content in real time (changes tracked), add comments on blocks |
| **Reviewer** | Reviews without editing | Add comments on blocks, view tracked changes |

---

## 3. Core Concepts

### 3.1 Template

A **template** is a structural blueprint for a document. It defines:
- An ordered set of **sections** (named regions grouping related blocks)
- Within each section, an ordered set of **blocks** (paragraphs, headings, fields, lists, etc.)
- Per-block metadata: **instruction** text and **editability** (editable vs. read-only)

Template structure is frozen when a document is instantiated from it. The document author and contributors cannot add, remove, or reorder template-defined sections or blocks.

### 3.2 Block Editability

Each block in a template has one of two states:

| State | Template Definition | Document Behavior |
|---|---|---|
| **Read-only** | `mutableContent: false` | Block content is frozen. Document authors see it as static content they cannot modify. |
| **Editable** | `mutableContent: true` / `editableField` node | Document authors may freely add, modify, and remove content inside the block. |

### 3.3 Block Instruction

An optional one-line annotation attached to any block or section by the template author. In document mode, instructions appear as contextual guidance (info tooltip or banner above the block) to help the document author understand what content belongs there. Instructions are informational only — they do not appear in the exported document.

### 3.4 Track Changes

Every edit made by a **contributor** (not the document author) is recorded as a tracked change with:
- **Author identity**: contributor user ID and display name
- **Timestamp**: ISO date-time of the edit
- **Change ID**: a stable identifier grouping a contiguous burst of keystrokes into one logical change unit

The document author can **accept** or **reject** each change individually or in bulk. All accept/reject actions are recorded in the audit log.

When the document is opened in the UI it renders as a clean document — tracked changes are visible only in "review mode" (track-changes overlay on) and do not disrupt the normal reading experience.

### 3.5 Comments

Reviewers and contributors can attach **comments** to any block or text range. A comment:
- Is anchored to a specific block or text range
- Carries the commenter's identity and timestamp
- May receive threaded **replies** from any participant
- Is visible to all participants (document author, contributors, all reviewers)
- Is rendered as a side-panel annotation or inline popover — it does not alter the document content
- Persists in the audit trail alongside tracked changes

### 3.6 Collaboration

Multiple participants edit the document simultaneously. The system must:
- Sync content in real time across all connected clients (CRDT / Yjs)
- Show **presence indicators**: colored cursors / carets per active user, avatar pills in the toolbar header
- Allow the document author to see who is currently making changes
- Gate contributor edits through the track-changes subsystem automatically

---

## 4. Functional Requirements

### 4.1 Template Authoring Experience

#### 4.1.1 Section Management
- **REQ-TA-01**: The template author can add a new section via the `/` slash-command palette or a floating `+` button at block boundaries.
- **REQ-TA-02**: Each section has an editable **title** field inline (committed on blur, not on every keystroke).
- **REQ-TA-03**: Each section has an editable **instruction** field inline.
- **REQ-TA-04**: Each section has a toggle to mark it **Mutable** (end users may add blocks inside) or **Fixed** (structure frozen).
- **REQ-TA-05**: Sections can be reordered via drag handle (visible only in template mode).

#### 4.1.2 Block Management
- **REQ-TA-06**: Within a section or at the document root, the template author can add any supported block type (paragraph, heading, list, code block, editable field, host-supplied form field) via the slash-command palette or `+` button.
- **REQ-TA-07**: Each block exposes an inline **instruction** input without leaving the editing surface.
- **REQ-TA-08**: Each block exposes an inline **editable/read-only** toggle.
- **REQ-TA-09**: Inline controls (instruction, toggle) appear in a non-intrusive overlay adjacent to the block — not in a separate sidebar panel.
- **REQ-TA-10**: The drag handle is visible on all blocks in template mode for reordering.

#### 4.1.3 Template Mode Visual Identity
- **REQ-TA-11**: A persistent **mode badge / banner** clearly labels the surface as "Template Editor".
- **REQ-TA-12**: The toolbar in template mode includes structure-specific tools (add section, add editable field, add form field, drag handle) that are hidden in document mode.
- **REQ-TA-13**: Template-only toolbar items must not appear (even disabled) in the document author toolbar.

---

### 4.2 Document Authoring Experience

#### 4.2.1 Page Layout
- **REQ-DA-01**: The document renders on paginated A4/letter-size page canvases, mimicking the Microsoft Word page-based layout.
- **REQ-DA-02**: Content that exceeds the page height overflows onto new pages automatically.
- **REQ-DA-03**: Page numbers are visible in the footer or margins.

#### 4.2.2 Block Interaction
- **REQ-DA-04**: As-is (no interaction), the document surface renders as a clean document — no block borders, no structural chrome.
- **REQ-DA-05**: On **hover** over a block, a subtle overlay reveals whether the block is **editable** or **read-only**, and surfaces the block's instruction if one exists.
- **REQ-DA-06**: Clicking into a **read-only** block produces visible feedback (tooltip: "This section is locked by the template") instead of silently swallowing the click.
- **REQ-DA-07**: Editable regions have a subtle visual boundary (dashed border / soft background tint) when hovered or focused, indicating the user may type.
- **REQ-DA-08**: Block instructions are shown as an info banner or tooltip above the block, styled as guidance not as document content.

#### 4.2.3 Permission Feedback
- **REQ-DA-09**: When a permission policy gate denies an action, the denial reason is surfaced to the user as a toast or inline status message — never silently swallowed.

---

### 4.3 Real-Time Collaboration

#### 4.3.1 Sync
- **REQ-CO-01**: All connected participants see content changes in real time via a CRDT (Yjs) transport.
- **REQ-CO-02**: The collaboration provider is host-supplied (websocket, Hocuspocus, TipTap Cloud) — the editor stays provider-agnostic.

#### 4.3.2 Presence
- **REQ-CO-03**: Each active participant's cursor / caret is shown in a unique color with their name label.
- **REQ-CO-04**: Avatar pills for all currently active participants are displayed in the toolbar or header area so the document author can see who is editing at a glance.

#### 4.3.3 Contributor Track Changes
- **REQ-CO-05**: When a **contributor** edits content, all changes are automatically recorded as tracked insertions/deletions — track changes is always-on for contributors.
- **REQ-CO-06**: The **document author** can toggle track-changes awareness on/off (gated by `policy.canToggleTrackChanges`).
- **REQ-CO-07**: Each tracked change displays the contributor's name, role, and relative timestamp on hover (via a popover).
- **REQ-CO-08**: The document author can **accept** or **reject** individual changes inline (click on the change → popover with Accept / Reject buttons).
- **REQ-CO-09**: Bulk **Accept All** / **Reject All** toolbar actions remain available.
- **REQ-CO-10**: Contributors and reviewers can only accept/reject their own changes; authors can act on all.

---

### 4.4 Comments

- **REQ-CM-01**: Any participant (contributor, reviewer) can attach a **comment** to a block or a selected text range.
- **REQ-CM-02**: Comments are anchored to the block/range and survive document edits that do not delete the anchor.
- **REQ-CM-03**: Each comment displays the author's name, avatar/initials, and creation timestamp.
- **REQ-CM-04**: Comments support **threaded replies** from any participant.
- **REQ-CM-05**: All comments are visible to every participant (document author, all contributors, all reviewers).
- **REQ-CM-06**: Comments are shown as a **side panel** (margin annotations) and/or an **inline popover** when the anchor is clicked or hovered.
- **REQ-CM-07**: The document author can **resolve** a comment thread (marks it as done, collapses it).
- **REQ-CM-08**: Resolved comments are archived and accessible via a "Show resolved" toggle — they are not permanently deleted.
- **REQ-CM-09**: Comment actions (add, reply, resolve) are recorded in the audit log with actor identity and timestamp.
- **REQ-CM-10**: Comments do not alter the document's exported content (Word/PDF export omits comment anchors by default).

---

### 4.5 Audit Trail & Traceability

- **REQ-AU-01**: Every privileged action (structure modification, field fill, track-change toggle, accept/reject, version save/restore, comment add/resolve) is recorded in the host-supplied `AuditLog` with: actor identity, timestamp, action type, document ID, and action payload.
- **REQ-AU-02**: Each tracked change carries a stable `changeId`, `authorId`, `author` (display name), and `timestamp` — these attributes persist in the document's serialized HTML/JSON.
- **REQ-AU-03**: The audit log is host-owned and host-queried (the editor does not render an audit UI — it only writes).
- **REQ-AU-04**: Signature-required actions (e.g., version restore) collect a `Signature` proof from the host's `SignatureCeremony` driver and attach it to the audit record.

---

### 4.6 Versioning

- **REQ-VS-01**: The document author can save a named version snapshot via `policy.canSaveVersion`.
- **REQ-VS-02**: Past versions are listed in a **Versions Panel** (sidebar).
- **REQ-VS-03**: Selecting a past version **previews** the diff (via the existing `DiffView`) before restore is committed.
- **REQ-VS-04**: Restoring a version is gated by `policy.canRestoreVersion` and optionally requires a signature.
- **REQ-VS-05**: Version snapshots are host-stored via the `VersionStore` driver.

---

### 4.7 Export

- **REQ-EX-01**: The document can be exported to **Word (.docx)** format, preserving sections, headings, paragraphs, and lists.
- **REQ-EX-02**: The document can be exported to **PDF** format (server-side render preferred for fidelity; client-side fallback acceptable).
- **REQ-EX-03**: Exported documents omit editor-only metadata: instructions, block-editability markers, comment anchors, unresolved track-change marks.

---

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Accessibility | Locked regions must carry `aria-readonly="true"`. Sections must have `role="region"` + `aria-label`. The editor container must have `role="textbox" aria-multiline="true"`. |
| NFR-02 | Accessibility | Track-change marks must use both color AND secondary visual indicator (underline for insertions, strikethrough for deletions) — never color alone. |
| NFR-03 | Accessibility | Slash-command palette must be fully keyboard-navigable (arrow keys, Enter to select, Escape to dismiss) and screen-reader compatible. |
| NFR-04 | Accessibility | Touch targets for toolbar buttons and inline controls must be ≥ 44×44 px. |
| NFR-05 | Performance | Comment anchors must survive CRDT edits without drift (Yjs relative positions or ProseMirror mapping). |
| NFR-06 | Security | All privileged operations flow through the host-supplied `PermissionPolicy` — the editor never self-authorises. |
| NFR-07 | Portability | No persistence, auth, transport, or telemetry logic lives inside the editor library — all are host-supplied drivers. |
| NFR-08 | Portability | The collaboration module is provider-agnostic: `y-websocket`, Hocuspocus, or TipTap Cloud all connect via the `CollaborationProviderFactory` interface. |

---

## 6. Out of Scope

- Authentication and user management (host-owned)
- Document storage and retrieval (host-owned via `VersionStore`)
- Audit log querying / reporting UI (host-owned; editor only writes)
- e-Signature ceremony UI (host-owned via `SignatureCeremony`)
- Template management UI (listing, creating, deleting templates is a host-app concern)

---

## 7. Requirement Coverage Map

The table below cross-references each requirement to the implementation area it touches.

| Requirement | Extension / Component |
|---|---|
| REQ-TA-01 to 05 | `section`, `slash-command`, `DragHandle` |
| REQ-TA-06 to 10 | `editable-field`, `field`, `block-instruction`, `slash-command` |
| REQ-TA-11 to 13 | `ModeBanner`, `Toolbar` (mode-filtered items) |
| REQ-DA-01 to 03 | `pages`, `PageBreak`, `PagesControls` |
| REQ-DA-04 to 08 | `template-guard`, `SectionView`, `EditableFieldView`, `block-instruction` |
| REQ-DA-09 | `PermissionToast` / event bus `permission.denied` |
| REQ-CO-01 to 02 | `collaboration` (Yjs driver) |
| REQ-CO-03 to 04 | `CollaborationCaret`, presence avatar UI |
| REQ-CO-05 to 10 | `track-changes`, `TrackChangesOverlay` |
| REQ-CM-01 to 10 | **Comments extension** _(not yet implemented)_ |
| REQ-AU-01 to 04 | `AuditLog` driver, all extension commands |
| REQ-VS-01 to 05 | `versioning`, `VersionsPanel`, `DiffView` |
| REQ-EX-01 | `word-export` |
| REQ-EX-02 | **PDF export** _(not yet implemented)_ |
| REQ-EX-03 | `word-export` serializer (partial) |
