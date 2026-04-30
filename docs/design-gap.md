# Design Gap Analysis: TipTap Template-Driven Block Editor

**Date**: 2026-04-30  
**Scope**: Full design critique across usability, visual hierarchy, consistency, and accessibility

---

## Overall Assessment

The editor has strong architectural foundations — driver injection, permission policy, dual-mode (template/document), and compliance-grade audit trail. The primary design gap is the **author experience**: the distance between what the system can do and what a document author can discover without training.

---

## Critical Issues

### C1 — Template vs Document mode has no UX distinction

**Problem**: Mode switching is a developer-level toggle. There is no visual affordance indicating which mode the user is in. Template mode (designing structure) and document mode (filling in content) share the same toolbar, layout, and visual language.

**Impact**: Authors don't understand what they can and cannot do. Template designers lack the spatial confidence of a "design mode."

**Recommendation**:
- Add a persistent mode badge/banner clearly labeling "Template Editor" vs "Document Editor"
- Build two toolbar profiles: a full template-designer toolbar (sections, fields, slash commands, structure tools) and a streamlined document-author toolbar (formatting, track changes, export)
- Consider separate routes: `/templates/:id` and `/documents/:id`

**Status**: 🔴 Open

---

### C2 — Editable regions have no visual boundary

**Problem**: In document mode, the `template-guard` silently blocks transactions outside editable regions. Users who click into a locked area receive no feedback — the edit just fails silently.

**Impact**: Feels like broken software. Authors can't tell where they're allowed to type.

**Recommendation**:
- Apply a subtle background tint and dashed border to `editableField` and `mutableContent` sections
- Show a tooltip or brief status message ("This section is locked by the template") when a user clicks or types in a locked region
- Use `aria-readonly="true"` on locked regions for assistive technology

**Status**: 🔴 Open

---

## Moderate Issues

### M1 — Permission denials are silent

**Problem**: When a `PermissionPolicy` gate denies an action, the denial is written to the audit log but no user-facing message is shown. The `reason` field in `PolicyDecision` is never surfaced to the UI.

**Impact**: Users don't know *why* an action failed, leading to confusion and repeated attempts.

**Recommendation**:
- Pipe `PolicyDecision.reason` to a toast notification or inline status message
- Example: "You don't have permission to accept changes — contact the template owner."
- For signature-required actions that are cancelled, show a clear "Action requires approval signature" prompt

**Status**: 🟡 Open

---

### M2 — Track changes: no inline accept/reject

**Problem**: Accept/Reject actions are only available as bulk toolbar operations ("Accept All", "Reject All"). There is no way to accept or reject individual tracked changes inline.

**Impact**: Reviewers working with granular changes (accepting some, rejecting others) must use external workarounds or process all changes at once.

**Recommendation**:
- Add hover-triggered accept/reject buttons on each tracked change mark
- Right-click context menu with accept/reject options on change marks
- Keep bulk toolbar actions as convenience shortcuts

**Status**: 🟡 Open

---

### M3 — Version restore has no preview

**Problem**: The VersionsPanel lists snapshots and allows restore, but restoring is a blind action — there is no preview of what will change before committing.

**Impact**: Users accidentally overwrite current work when they intended to just inspect a past version.

**Recommendation**:
- Wire the existing `DiffView` component into the version restore flow
- Selecting a version in the panel shows a side-by-side diff of that version vs current content before the user confirms
- Add a "Preview" button alongside "Restore" in the panel

**Status**: 🟡 Open

---

### M4 — No PDF export

**Problem**: Word (.docx) export is implemented. PDF export is listed as a product requirement but is missing.

**Impact**: For regulated workflows, PDF is the canonical archival format. Word export is a stepping stone, not the destination.

**Recommendation**:
- Option A: Server-side PDF rendering via Puppeteer/Playwright for pixel-perfect output
- Option B: Client-side using `html2pdf` or `@react-pdf/renderer` for simpler cases
- Option C: Two-step — export Word and convert server-side (simpler to implement, less control)
- For compliance environments, embed digital signature metadata in the PDF

**Status**: 🟡 Open

---

### M5 — Slash command discoverability

**Problem**: The `/` command palette is the primary way to add sections and fields in template mode, but it's invisible until you know to type `/`. No other affordance exists for inserting blocks.

**Impact**: Non-technical template authors don't discover the content insertion mechanism.

**Recommendation**:
- Add a floating `+` button at block boundaries (adjacent to existing drag handles)
- The `+` button opens the same slash command palette
- Keep `/` as the power-user shortcut

**Status**: 🟡 Open

---

## Minor Issues

### m1 — Toolbar clutter from cross-mode items

Items registered by template-only extension modules appear (disabled) in the document-author toolbar. This creates visual noise and confusion.

**Recommendation**: Filter toolbar items by `ctx.mode` at render time so document authors never see disabled template tools.

**Status**: 🟢 Open

---

### m2 — Toolbar button label inconsistency

Export buttons use emoji-style labels ("↓ Word", "⎵ Page Break") while other toolbar items use plain text. Mixed convention creates visual inconsistency.

**Recommendation**: Standardize on icon + tooltip label, or consistently use text labels across all toolbar items.

**Status**: 🟢 Open

---

### m3 — Collaborative presence has no visual UI

The Yjs awareness system is wired but the playground shows no visual indication of who else is editing (no avatar pills, no colored cursors in the document).

**Recommendation**: Add user avatar pills in the toolbar header and colored cursor/selection overlays in the document body. For regulated environments, who-is-editing matters for audit and accountability.

**Status**: 🟢 Open

---

### m4 — DiffView and track changes use different mental models

DiffView shows block-level side-by-side comparison; track changes shows inline marks. Two conceptually overlapping features with inconsistent presentation.

**Recommendation**: Add inline diff highlighting mode to DiffView as an alternative to side-by-side. For "compare to template" use cases, inline diff may be more readable than two-pane.

**Status**: 🟢 Open

---

## Accessibility Gaps

| Area | Finding | Fix |
|------|---------|-----|
| Track change marks | Rely solely on color (green/red) to convey insertion/deletion | Add strikethrough for deletions, underline for insertions as secondary indicators |
| Keyboard navigation | Slash command palette keyboard accessibility unverified | Verify arrow-key nav, Enter to select, Escape to dismiss, and screen reader compatibility |
| Touch targets | Toolbar buttons and inline accept/reject affordances may be under 44×44px | Ensure minimum touch target sizes for tablet editing use cases |
| ARIA roles | Sections, locked regions, and the editor container lack explicit ARIA roles | Add `role="region"` + `aria-label` for sections; `aria-readonly="true"` for locked regions; `role="textbox" aria-multiline="true"` for the editor |
| Focus management | Clicking a locked region may leave focus in an ambiguous state | On blocked click, move focus to the nearest editable region |

---

## Priority Roadmap

| Priority | ID | Title | Effort |
|----------|-----|-------|--------|
| P0 | C1 | Mode-aware UI (toolbar profiles + mode indicator) | M |
| P0 | C2 | Editable region visual boundaries + locked feedback | S |
| P1 | M1 | Surface permission denial reasons as toast/status | S |
| P1 | M2 | Inline accept/reject on individual tracked changes | M |
| P1 | M3 | Version preview (DiffView in restore flow) | M |
| P1 | M4 | PDF export | L |
| P2 | M5 | Floating `+` button for block insertion | S |
| P2 | m1 | Mode-filtered toolbar items | S |
| P3 | m2 | Toolbar label consistency | XS |
| P3 | m3 | Collaborative presence UI | M |
| P3 | m4 | Unified diff model | M |
