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

const STYLE_TAG_ID = "tpe-block-instruction-style";
const STYLE_RULES = `
.tpe-instruction-widget {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  line-height: 1;
  color: var(--instruction-accent, #3b82f6);
  background: var(--instruction-bg, rgba(59, 130, 246, 0.1));
  padding: 4px 8px;
  border-radius: 12px;
  margin: 0 0 2px;
  user-select: none;
  pointer-events: none;
  font-style: normal;
  font-weight: 500;
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
      showInstructions: true,
    };
  },

  addCommands() {
    return {
      toggleInstructions:
        () =>
        ({ editor }) => {
          editor.storage.blockInstruction.showInstructions =
            !editor.storage.blockInstruction.showInstructions;
          // Dispatch empty transaction to force UI update
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
        decos.push(
          Decoration.widget(
            pos,
            () => {
              const el = document.createElement("div");
              el.className = "tpe-instruction-widget";
              el.setAttribute("contenteditable", "false");
              el.setAttribute("aria-label", `Instruction: ${instruction}`);
              el.textContent = `💡 ${instruction}`;
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
