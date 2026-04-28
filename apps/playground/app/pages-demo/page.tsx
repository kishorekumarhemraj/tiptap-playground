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
          <div className={styles.badge}>@tiptap-pro/extension-pages-pagekit</div>
          <h1 className={styles.title}>Pages Demo</h1>
          <p className={styles.subtitle}>
            Paginated document layout powered by{" "}
            <code>PageKit</code> — A4/Letter pages with proper margins,
            headers, footers, page breaks, and zoom. Double-click the header
            or footer area to edit them.
          </p>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.editorCard}>
          <PagesShell />
        </div>
      </div>

      <footer className={styles.footer}>
        Requires{" "}
        <code>TIPTAP_PRO_TOKEN</code> · Team plan ·{" "}
        <a
          href="https://tiptap.dev/docs/pages/getting-started/overview"
          target="_blank"
          rel="noopener noreferrer"
        >
          TipTap Pages docs
        </a>
      </footer>
    </div>
  );
}
