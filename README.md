# tiptap-playground

Notion-style TipTap editor built on **Next.js 15 + Turbopack + React 19 + TypeScript**. The editor is composed out of small, self-contained *extension modules* so new TipTap extensions can be added without touching the core.

## Getting started

```bash
npm install
npm run dev        # Next.js + Turbopack on http://localhost:3000
npm run typecheck
npm run build      # production build, also uses Turbopack
```

## Architecture

```
app/                        Next.js App Router shell
src/editor/
  Editor.tsx                Thin wrapper around `useEditor`
  EditorShell.tsx           Host surface (user, feature flags, read-only toggle)
  Toolbar.tsx               Renders toolbar entries contributed by modules
  registry.ts               Assembles TipTap extensions + toolbar items from modules
  types.ts                  `EditorExtensionModule`, `EditorExtensionContext`
  extensions/
    core-formatting/        StarterKit + Notion-ish formatting
    locked-block/           Custom node + transaction-filter guard
    collaboration/          Stub (Yjs / hocuspocus)
    track-changes/          Insertion / deletion marks (stub)
    versioning/             Snapshot contract (stub)
    diff-view/              Side-by-side renderer contract (stub)
    index.ts                `defaultExtensionModules` array
```

### The extension module contract

Every feature implements [`EditorExtensionModule`](src/editor/types.ts):

```ts
interface EditorExtensionModule {
  id: string;
  name: string;
  tiptap?: (ctx) => AnyExtension[];   // TipTap extensions to register
  toolbar?: (ctx) => ToolbarItem[];   // Toolbar entries
  enabled?: (ctx) => boolean;         // Feature flag
}
```

The registry dedupes by extension name, filters disabled modules, and
flattens the contributions in order. Adding a new extension is a
three-step change:

1. Create `src/editor/extensions/<feature>/index.ts` exporting a module.
2. Append it to `defaultExtensionModules` in `src/editor/extensions/index.ts`.
3. (Optional) Add feature-specific config under `ctx.features.<id>`.

No other part of the editor needs to change.

## Planned extensions

| Module | Status | Design note |
|---|---|---|
| Collaborative editing | stub | Wire `@tiptap/extension-collaboration` to a shared Y.Doc over `y-websocket` / hocuspocus. `CollaborationCursor` reads user info from `ctx.user`. Enable by providing `ctx.features.collaboration.provider`. |
| Track changes | partial | Ships `insertion`/`deletion` marks so the schema is stable. Toggling "track mode" maps every replace-step into those marks; accept/reject removes them. |
| Versioning | stub | Editor-side contract: emits snapshots, offers `restore(snapshotId)`. Persistence belongs to the host app. |
| Locked / readonly / conditional blocks | implemented | `lockedBlock` node + `LockGuard` transaction filter. Modes: `locked`, `readonly`, `conditional` (string expression evaluated by the host). |
| Side-by-side diff | stub | Two read-only editors sharing the same extension set, fed two snapshots. Track-changes marks and locked-block chrome render identically in both panes. |

## Why Turbopack

Turbopack is wired through the `--turbopack` flag on both `next dev`
and `next build` (see `package.json`). Turbopack gives us fast HMR
for an editor with a lot of nested React components and CSS modules,
and it's now the stable default for Next.js 15.
