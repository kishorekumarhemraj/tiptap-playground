import Link from "next/link";
import { EditorShell } from "./editor/EditorShell";
import styles from "./page.module.css";

export default function Page() {
  return (
    <div className={styles.main}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.badge}>@tiptap-playground/editor</div>
          <h1 className={styles.title}>TipTap Playground</h1>
          <p className={styles.subtitle}>
            Template-based editor with sections, editable regions, host-driven
            form fields, collaboration, track changes, versioning, and
            side-by-side diff — powered by{" "}
            <code>@tiptap-playground/editor</code>. Every privileged action
            flows through host-supplied drivers and a{" "}
            <code>PermissionPolicy</code>.
          </p>
          <Link href="/pages-demo" className={styles.demoLink}>
            Also see: Pages Demo →
          </Link>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.editorCard}>
          <EditorShell />
        </div>
      </div>

      <footer className={styles.footer}>
        Library in <code>packages/editor</code> · MIT License
      </footer>
    </div>
  );
}
