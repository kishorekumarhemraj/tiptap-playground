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

## Extensions

| Module | Status | Notes |
|---|---|---|
| Collaborative editing | implemented | Yjs-backed. Set `NEXT_PUBLIC_COLLAB_URL=ws://localhost:1234` (and optionally `NEXT_PUBLIC_COLLAB_ROOM`) to connect to a `y-websocket` server. IndexedDB persistence is on by default so reloads stay offline-friendly. The module gates itself off when no provider URL is configured. |
| Track changes | implemented | Toggle the `✎ Track` button. While on, insertions are wrapped in `insertion` marks via `appendTransaction`; Backspace / Delete are intercepted to add `deletion` marks instead of removing text. `acceptAllChanges` / `rejectAllChanges` resolve the queue. |
| Versioning | implemented | `Versioning` extension stores snapshots in `localStorage` keyed by `documentId`. Commands: `saveVersion(label?)`, `restoreVersion(id)`, `deleteVersion(id)`. The host `VersionsPanel` lists snapshots and lets you restore or compare. |
| Locked / readonly / conditional blocks | implemented | `lockedBlock` node + `LockGuard` transaction filter. Modes: `locked`, `readonly`, `conditional` (string expression evaluated by the host). |
| Side-by-side diff | implemented | `DiffView` mounts two read-only editors using the same module pipeline and passes a per-block diff annotation to a `DiffDecorations` plugin so changed blocks light up green / red. Trigger by selecting two versions in the right-hand panel and clicking **Compare selected**. |

### Running collaborative editing locally

```bash
npx y-websocket   # starts ws://localhost:1234
NEXT_PUBLIC_COLLAB_URL=ws://localhost:1234 npm run dev
```

Open the page in two tabs - edits sync over the websocket and remote
selections appear as colored carets.

## Why Turbopack

Turbopack is wired through the `--turbopack` flag on both `next dev`
and `next build` (see `package.json`). Turbopack gives us fast HMR
for an editor with a lot of nested React components and CSS modules,
and it's now the stable default for Next.js 15.
