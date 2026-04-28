"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
  type VersionsPanelHandle,
} from "@tiptap-playground/editor/react";
import { buildPlaygroundDrivers } from "./drivers";
import styles from "./EditorShell.module.css";

const DOCUMENT_ID = "playground-doc";
// Bumped to v2 when the schema dropped `lockedBlock` and added
// `section` / `editableField` / `field`. Old persisted JSON would
// fail to parse against the new schema.
const CONTENT_KEY = `tiptap-editor:content:v2:${DOCUMENT_ID}`;

const DEFAULT_CONTENT = `
<h1>Quarterly Compliance Review</h1>
<p data-instruction="Header block — author this in template mode.">
  This template captures the reviewer's findings, decision, and any
  follow-up actions for the quarterly compliance review.
</p>

<section data-type="section" data-title="Header" data-instruction="Static template content. The reviewer cannot edit this.">
  <p>
    Reviewer: <span data-type="field" data-field-id="reviewer-name"></span>
    on <span data-type="field" data-field-id="review-date"></span>.
  </p>
</section>

<section data-type="section" data-title="Findings" data-instruction="Reviewer's free-form summary of observations">
  <div data-type="editable-field" data-instruction="Summarise key findings (3–5 sentences)" data-placeholder="Describe what was reviewed, methodology, and observations…">
    <p></p>
  </div>
</section>

<section data-type="section" data-title="Decision">
  <p>
    Final decision: <span data-type="field" data-field-id="decision"></span>.
    Risk score: <span data-type="field" data-field-id="risk-score"></span>.
    <span data-type="field" data-field-id="needs-followup"></span>
  </p>
</section>

<section data-type="section" data-title="Action items" data-instruction="Add as many follow-up items as needed" data-mutable-content="true">
  <p>The reviewer can add new bullet points here in document mode.</p>
  <ul>
    <li>Initial action item placeholder</li>
  </ul>
</section>
`;

function loadInitialContent(): JSONContent | string {
  if (typeof window === "undefined") return DEFAULT_CONTENT;
  try {
    const raw = window.localStorage.getItem(CONTENT_KEY);
    if (raw) return JSON.parse(raw) as JSONContent;
  } catch {
    /* corrupt storage — fall back to default */
  }
  return DEFAULT_CONTENT;
}

export function EditorShell() {
  const [readOnly, setReadOnly] = useState(false);
  const [mode, setMode] = useState<EditorMode>("template");
  const [editor, setEditor] = useState<VersionsPanelHandle | null>(null);
  const [diffSelection, setDiffSelection] = useState<{
    left: string | null;
    right: string | null;
  }>({ left: null, right: null });
  const [diffPair, setDiffPair] = useState<{
    left: DiffPaneVersion;
    right: DiffPaneVersion;
  } | null>(null);

  // Persist the current document across context rebuilds AND page
  // reloads. On mount we read from localStorage; on every update we
  // write back. When the user toggles Template <-> Document we still
  // pass the latest JSON so the editor keeps whatever the user wrote.
  const latestJsonRef = useRef<JSONContent | string>(loadInitialContent());
  const handleUpdateJSON = useCallback((json: JSONContent) => {
    latestJsonRef.current = json;
    // Auto-save every edit so instructions survive a page refresh.
    try {
      window.localStorage.setItem(CONTENT_KEY, JSON.stringify(json));
    } catch {
      /* quota / private mode — non-fatal */
    }
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

  const handleEditor = useCallback(
    (_handle: unknown, versionsPanelHandle: VersionsPanelHandle | null) => {
      setEditor(versionsPanelHandle);
    },
    [],
  );

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
              title="Author the template: add sections, editable regions, and form fields"
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
              title="Fill in a document: structure is fixed; only editable regions and fields accept input"
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
