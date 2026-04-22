"use client";

import { useMemo, useState } from "react";
import { Editor } from "./Editor";
import { defaultExtensionModules } from "./extensions";
import type { EditorExtensionContext } from "./types";
import styles from "./EditorShell.module.css";

/**
 * The "host" surface. In a real app this is where you'd pull
 * `documentId`, current user, feature flags, etc. from your app
 * shell. Here it's hard-coded so the playground runs out of the box.
 */
export function EditorShell() {
  const [readOnly, setReadOnly] = useState(false);

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
        // `collaboration` is only enabled when a provider is wired up;
        // leaving it out keeps the editor fully offline-friendly.
      },
    }),
    [readOnly],
  );

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
        </span>
      </div>
      <Editor modules={defaultExtensionModules} context={context} />
    </div>
  );
}
