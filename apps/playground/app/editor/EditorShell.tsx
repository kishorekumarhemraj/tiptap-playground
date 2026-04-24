"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import {
  defaultExtensionModules,
  defaultPermissionPolicy,
  createEventBus,
  type EditorExtensionContext,
  type EditorMode,
  type VersionSnapshot,
} from "@tiptap-playground/editor";
import {
  Editor,
  VersionsPanel,
  DiffView,
  type DiffPaneVersion,
} from "@tiptap-playground/editor/react";
import { buildPlaygroundDrivers } from "./drivers";
import styles from "./EditorShell.module.css";

const DOCUMENT_ID = "playground-doc";

const DEFAULT_CONTENT = `
<h1>Welcome to the TipTap Playground</h1>
<p>
  This app is a thin host on top of <code>@tiptap-playground/editor</code>.
  Every privileged action flows through injected drivers.
</p>
<p>Try formatting text, creating lists, or inserting a locked section.</p>
<div data-type="locked-block" data-lock-mode="locked" data-lock-reason="Legal boilerplate">
  <p>This section is locked. Typing inside it is rejected by the transaction guard.</p>
</div>
<div data-type="locked-block" data-lock-mode="readonly">
  <p>This section is read-only - visible to everyone, editable by nobody.</p>
</div>
<div data-type="locked-block" data-lock-mode="conditional" data-lock-condition="user.role === 'admin'">
  <p>This section only opens up when the condition evaluates truthy.</p>
</div>
`;

export function EditorShell() {
  const [readOnly, setReadOnly] = useState(false);
  const [mode, setMode] = useState<EditorMode>("template");
  const [editor, setEditor] = useState<TiptapEditor | null>(null);
  const [diffSelection, setDiffSelection] = useState<{
    left: string | null;
    right: string | null;
  }>({ left: null, right: null });
  const [diffPair, setDiffPair] = useState<{
    left: DiffPaneVersion;
    right: DiffPaneVersion;
  } | null>(null);

  // Persist the current document across context rebuilds. When the
  // user toggles Template <-> Document we want the Editor to pick up
  // the new policy / mode wiring but keep whatever the user just
  // wrote. The ref holds the latest JSON and is read as
  // `initialContent` every time the Editor remounts.
  const latestJsonRef = useRef<JSONContent | string>(DEFAULT_CONTENT);
  const handleUpdateJSON = useCallback((json: JSONContent) => {
    latestJsonRef.current = json;
  }, []);

  // Every concern the editor needs is assembled in one place: user,
  // drivers, policy, event bus. This mirrors how a real host app
  // would wire the editor - the components in the library never
  // build any of these on their own.
  const context = useMemo<EditorExtensionContext>(() => {
    const events = createEventBus();
    const drivers = buildPlaygroundDrivers(DOCUMENT_ID);
    const policy = defaultPermissionPolicy({
      evaluateCondition: (expression, ctx) => {
        // Trivial evaluator - a real host would parse the expression
        // properly (JSON Logic, CEL, mvel, ...). Here we just look
        // for the demo "admin" flag.
        try {
          const roles = (ctx.user.roles ?? []) as string[];
          if (expression.includes("admin")) return roles.includes("admin");
          return false;
        } catch {
          return false;
        }
      },
    });
    return {
      documentId: DOCUMENT_ID,
      user: {
        id: "user-local",
        name: "You",
        color: "#2383e2",
        roles: ["author"],
      },
      readOnly,
      mode,
      features: {},
      claims: {},
      drivers,
      policy,
      events,
    };
  }, [readOnly, mode]);

  const handleEditor = useCallback((next: TiptapEditor | null) => {
    setEditor(next);
  }, []);

  const collabEnabled = !!context.drivers.collaboration;

  return (
    <div className={styles.shell}>
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          <div
            className={styles.segmented}
            role="radiogroup"
            aria-label="Editor mode"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "template"}
              className={styles.segmentedButton}
              data-active={mode === "template"}
              onClick={() => setMode("template")}
              title="Author a template: locks can be set, changed, moved"
            >
              Template
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "document"}
              className={styles.segmentedButton}
              data-active={mode === "document"}
              onClick={() => setMode("document")}
              title="Document from template: locked blocks are read-only and immovable"
            >
              Document
            </button>
          </div>
          <label className={styles.toggleLabel}>
            <span className={styles.switchWrapper}>
              <input
                type="checkbox"
                checked={readOnly}
                onChange={(e) => setReadOnly(e.target.checked)}
              />
              <span className={styles.switchTrack} />
              <span className={styles.switchThumb} />
            </span>
            Read-only
          </label>
        </div>
        <div className={styles.controlsRight}>
          <span className={styles.statusPill}>
            <span
              className={styles.statusDot}
              data-off={!collabEnabled ? "true" : undefined}
            />
            {collabEnabled ? "Collab on" : "Collab off"}
          </span>
          <span className={styles.statusPill}>
            {defaultExtensionModules.length} module
            {defaultExtensionModules.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.editorColumn}>
          <Editor
            modules={defaultExtensionModules}
            context={context}
            initialContent={latestJsonRef.current}
            onEditor={handleEditor}
            onUpdateJSON={handleUpdateJSON}
          />
        </div>
        <VersionsPanel
          editor={editor}
          diffSelection={diffSelection}
          onChangeDiffSelection={setDiffSelection}
          onCompare={(left, right) =>
            setDiffPair({
              left: snapshotToDiffPane(left),
              right: snapshotToDiffPane(right),
            })
          }
        />
      </div>

      {diffPair && (
        <div
          className={styles.diffOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDiffPair(null);
          }}
        >
          <div className={styles.diffOverlayInner}>
            <DiffView
              modules={defaultExtensionModules}
              context={context}
              left={diffPair.left}
              right={diffPair.right}
              onClose={() => setDiffPair(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function snapshotToDiffPane(s: VersionSnapshot): DiffPaneVersion {
  return { id: s.id, label: s.label, at: s.at, json: s.json };
}
