import { PagesShell } from "./PagesShell";
import styles from "./page.module.css";

export const metadata = {
  title: "Pages Demo — TipTap Playground",
  description:
    "Paginated document layout with TipTap PageKit: A4/Letter pages, headers, footers, zoom, and page breaks.",
};

export default function PagesPage() {
  return (
    <div className={styles.main}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.badge}>@tiptap-playground/editor · PageKit</div>
          <h1 className={styles.title}>Pages Demo</h1>
          <p className={styles.subtitle}>
            Paginated document layout powered by our open-source{" "}
            <code>PageKit</code> extension — A4/Letter/Legal pages with
            configurable margins, headers, footers, zoom, and explicit page
            breaks. No commercial license required.
          </p>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.editorCard}>
          <PagesShell />
        </div>
      </div>

      <footer className={styles.footer}>
        Open-source · MIT License · Extension in{" "}
        <code>packages/editor/src/extensions/pages</code>
      </footer>
    </div>
  );
}
