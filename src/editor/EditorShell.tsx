"use client";

import { useCallback, useMemo, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { Editor } from "./Editor";
import { defaultExtensionModules } from "./extensions";
import type { EditorExtensionContext } from "./types";
import { VersionsPanel } from "./VersionsPanel";
import {
  DiffView,
  type DiffPaneVersion,
} from "./extensions/diff-view";
import styles from "./EditorShell.module.css";

/**
 * Host surface. In a real app this is where you'd pull `documentId`,
 * current user, and feature flags from your app shell. Here the
 * collaboration provider URL is opt-in via `NEXT_PUBLIC_COLLAB_URL`
 * so the editor still runs offline.
 */
export function EditorShell() {
  const [readOnly, setReadOnly] = useState(false);
  const [editor, setEditor] = useState<TiptapEditor | null>(null);
  const [diffSelection, setDiffSelection] = useState<{
    left: string | null;
    right: string | null;
  }>({ left: null, right: null });
  const [diffPair, setDiffPair] = useState<{
    left: DiffPaneVersion;
    right: DiffPaneVersion;
  } | null>(null);

  const collabUrl =
    process.env.NEXT_PUBLIC_COLLAB_URL ?? "";
  const collabRoom =
    process.env.NEXT_PUBLIC_COLLAB_ROOM ?? "tiptap-playground";

  const context = useMemo<EditorExtensionContext>(
    () => ({
      documentId: "playground-doc",
      user: {
        id: "user-local",
        name: "You",
        color: "#2383e2",
      },
      readOnly,
      features: {
        collaboration: collabUrl
          ? { provider: { url: collabUrl, room: collabRoom } }
          : undefined,
      },
    }),
    [readOnly, collabUrl, collabRoom],
  );

  const handleEditor = useCallback((next: TiptapEditor | null) => {
    setEditor(next);
  }, []);

  return (
    <div className={styles.shell}>
      <div className={styles.controls}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={readOnly}
            onChange={(e) => setReadOnly(e.target.checked)}
          />
          <span>Read-only document</span>
        </label>
        <span className={styles.hint}>
          {defaultExtensionModules.length} extension module
          {defaultExtensionModules.length === 1 ? "" : "s"} registered
          {collabUrl ? " · collab on" : " · collab off (set NEXT_PUBLIC_COLLAB_URL)"}
        </span>
      </div>
      <div className={styles.body}>
        <div className={styles.editorColumn}>
          <Editor
            modules={defaultExtensionModules}
            context={context}
            onEditor={handleEditor}
          />
        </div>
        <VersionsPanel
          editor={editor}
          diffSelection={diffSelection}
          onChangeDiffSelection={setDiffSelection}
          onCompare={(left, right) =>
            setDiffPair({
              left: {
                id: left.id,
                label: left.label,
                at: left.at,
                json: left.json,
              },
              right: {
                id: right.id,
                label: right.label,
                at: right.at,
                json: right.json,
              },
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
