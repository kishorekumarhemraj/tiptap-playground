import { EditorShell } from "./editor/EditorShell";
import styles from "./page.module.css";

export default function Page() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>TipTap Playground</h1>
          <p className={styles.subtitle}>
            Demo host for <code>@tiptap-playground/editor</code>. Every
            privileged action flows through a host-supplied
            <code>PermissionPolicy</code>, <code>VersionStore</code>,
            <code>AuditLog</code>, and optional collaboration /
            signature drivers - the same editor can drop into any
            React app without code changes.
          </p>
        </div>
      </header>

      <section className={styles.editorSection}>
        <EditorShell />
      </section>

      <footer className={styles.footer}>
        Library lives in <code>packages/editor</code>; this app is the
        demo harness. Core modules: collaborative editing, track
        changes, versioning, locked / readonly / conditional blocks,
        side-by-side diff.
      </footer>
    </main>
  );
}
