import { EditorShell } from "@/editor/EditorShell";
import styles from "./page.module.css";

export default function Page() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>TipTap Playground</h1>
          <p className={styles.subtitle}>
            A Notion-style editor with a modular extension pipeline. Drop a new
            extension into <code>src/editor/extensions</code>, register it, and
            it becomes available everywhere the editor is mounted.
          </p>
        </div>
      </header>

      <section className={styles.editorSection}>
        <EditorShell />
      </section>

      <footer className={styles.footer}>
        Planned extensions: collaborative editing &middot; track changes &middot;
        versioning &middot; locked / readonly / conditional blocks &middot;
        side-by-side diff.
      </footer>
    </main>
  );
}
