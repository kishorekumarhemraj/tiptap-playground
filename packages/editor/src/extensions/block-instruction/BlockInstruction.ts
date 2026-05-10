import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorMode } from "../../core/types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockInstruction: {
      toggleInstructions: () => ReturnType;
    };
  }
  interface Storage {
    blockInstruction: { showInstructions: boolean };
  }
}


const instructionKey = new PluginKey("blockInstruction");

// UI preference (not document data) — the toggle state belongs to the
// viewer's session, like a dark-mode toggle. Persisting it next to the
// command keeps the wiring trivial; document persistence still flows
// through the host's drivers.
const STORAGE_KEY = "tpe:block-instruction:show";

function loadShowFromStorage(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "false") return false;
    if (raw === "true") return true;
  } catch {
    /* private mode / quota — fall through */
  }
  return true;
}

function saveShowToStorage(show: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(show));
  } catch {
    /* non-fatal */
  }
}

const STYLE_TAG_ID = "tpe-block-instruction-style";
const STYLE_RULES = `

/* Hide ALL instruction surfaces (widget decorations + NodeView banners)
   when the editor root carries this class. NodeView banners can't
   re-render on storage mutations, so CSS is the reliable toggle path. */
.tpe-instructions-hidden .tpe-instruction-widget,
.tpe-instructions-hidden .tpe-instruction-banner,
.tpe-instructions-hidden .tpe-field-instruction {
  display: none !important;
}

/* Compact document-mode sections when instructions are hidden.
   Without the instruction banners the fixed padding/margin leave large
   blank gaps — especially noticeable with nested sections. */
.tpe-instructions-hidden .tpe-section {
  padding-top: 2px !important;
  padding-bottom: 2px !important;
  margin-bottom: 6px !important;
}
`;

let styleRefCount = 0;

function attachStyles() {
  if (typeof document === "undefined") return;
  styleRefCount++;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = STYLE_RULES;
  document.head.appendChild(style);
}

function detachStyles() {
  if (typeof document === "undefined") return;
  styleRefCount = Math.max(0, styleRefCount - 1);
  if (styleRefCount === 0) {
    document.getElementById(STYLE_TAG_ID)?.remove();
  }
}

/**
 * Authoring-only block attribute that lets template authors annotate
 * any top-level block with a one-line instruction shown above the
 * block's content in both template and document mode.
 *
 * Storage: a ProseMirror node attribute `instruction` (serialises to
 * `data-instruction` in HTML so it round-trips through copy-paste).
 *
 * Rendering: a `Decoration.widget` inserted just before the block
 * node. This is more reliable than CSS `::before` because it works
 * on React NodeViews, code blocks, and every other block type without
 * fighting CSS specificity or the `::before` content-model rules on
 * `<p>` elements.
 */
export const BlockInstruction = Extension.create<{ mode: EditorMode }>({
  name: "blockInstruction",

  addOptions() {
    return { mode: "document" as EditorMode };
  },

  addGlobalAttributes() {
    // `section` and `editableField` declare `instruction` themselves
    // (it's intrinsic to those nodes). For everything else, the
    // attribute is bolted on globally so any block can carry one.
    return [
      {
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "codeBlock",
        ],
        attributes: {
          instruction: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute("data-instruction") || null,
            renderHTML: (attrs) => {
              const value = attrs.instruction as string | null;
              if (!value) return {};
              return { "data-instruction": value };
            },
          },
        },
      },
    ];
  },

  addStorage() {
    return {
      showInstructions: loadShowFromStorage(),
    };
  },

  onCreate() {
    // Apply the persisted preference to the editor DOM as soon as it
    // mounts so the user doesn't see a flash of the wrong state.
    const show = this.editor.storage.blockInstruction.showInstructions;
    this.editor.view.dom.classList.toggle("tpe-instructions-hidden", !show);
  },

  addCommands() {
    return {
      toggleInstructions:
        () =>
        ({ editor }) => {
          const show = !editor.storage.blockInstruction.showInstructions;
          editor.storage.blockInstruction.showInstructions = show;
          // CSS class toggles all instruction surfaces (widget decorations +
          // NodeView banners) without requiring React NodeView re-renders.
          editor.view.dom.classList.toggle("tpe-instructions-hidden", !show);
          saveShowToStorage(show);
          // Transaction dispatch rebuilds the decoration set for widget hints.
          editor.view.dispatch(editor.state.tr.setMeta(instructionKey, {}));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    attachStyles();
    const editor = this.editor;

    function buildDecoSet(
      doc: import("@tiptap/pm/model").Node,
      show: boolean,
    ): DecorationSet {
      if (!show) return DecorationSet.empty;
      const decos: Decoration[] = [];
      doc.forEach((node, pos) => {
        const instruction = node.attrs?.instruction as string | null;
        if (!instruction) return;
        // section and editableField render their own instruction UI in their
        // NodeViews — adding a widget decoration here would duplicate it.
        if (node.type.name === "section" || node.type.name === "editableField") return;
        decos.push(
          Decoration.widget(
            pos,
            () => {
              const el = document.createElement("div");
              el.className = "tpe-instruction-widget";
              el.setAttribute("contenteditable", "false");
              el.setAttribute("aria-label", `Instruction: ${instruction}`);
              Object.assign(el.style, {
                display: "flex",
                alignItems: "flex-start",
                gap: "6px",
                padding: "6px 10px",
                marginBottom: "6px",
                background: "rgba(37,99,235,0.10)",
                borderRadius: "6px",
                border: "1px solid rgba(37,99,235,0.15)",
                fontSize: "12px",
                color: "#3b5ea6",
                lineHeight: "1.4",
                userSelect: "none",
                pointerEvents: "none",
                fontStyle: "normal",
                fontWeight: "400",
              });
              el.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex-shrink:0;margin-top:1px"><circle cx="8" cy="8" r="6" stroke="#3b5ea6" stroke-width="1.4"/><line x1="8" y1="7.5" x2="8" y2="11.5" stroke="#3b5ea6" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="5.5" r="0.75" fill="#3b5ea6"/></svg><span>${instruction}</span>`;
              return el;
            },
            { side: -1, key: `instruction:${pos}:${instruction}` },
          ),
        );
      });
      return DecorationSet.create(doc, decos);
    }

    // In template mode the instruction is already editable in the
    // SectionView header — rendering it again as a floating widget
    // would duplicate it. Decorations are document-mode only.
    const isDocumentMode = this.options.mode === "document";

    return [
      new Plugin({
        key: instructionKey,
        view: () => ({ destroy: detachStyles }),
        // Stateful decoration set: on transactions that don't change the
        // doc, map existing decoration positions through the step mapping
        // (O(decorations)) instead of re-walking the whole doc (O(nodes)).
        // Rebuild only when the doc changes or the toggle meta fires.
        state: {
          init(_, { doc }) {
            const show =
              isDocumentMode &&
              (editor.storage.blockInstruction?.showInstructions ?? true);
            return buildDecoSet(doc, show);
          },
          apply(tr, set) {
            const toggleMeta = tr.getMeta(instructionKey);
            const show =
              isDocumentMode &&
              (editor.storage.blockInstruction?.showInstructions ?? true);
            if (toggleMeta !== undefined || tr.docChanged) {
              return buildDecoSet(tr.doc, show);
            }
            return set.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return instructionKey.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
