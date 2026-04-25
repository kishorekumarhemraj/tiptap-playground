import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockInstruction: {
      toggleInstructions: () => ReturnType;
    };
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

function ensureStyles() {
  if (typeof document === "undefined") return;
  let style = document.getElementById(STYLE_TAG_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_TAG_ID;
    document.head.appendChild(style);
  }
  style.textContent = STYLE_RULES;
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
export const BlockInstruction = Extension.create({
  name: "blockInstruction",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "codeBlock",
          "lockedBlock",
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
    ensureStyles();
    const editor = this.editor;

    return [
      new Plugin({
        key: instructionKey,
        props: {
          decorations(state) {
            if (!editor.storage.blockInstruction?.showInstructions) {
              return DecorationSet.empty;
            }

            const decos: Decoration[] = [];

            state.doc.forEach((node, pos) => {
              const instruction = node.attrs?.instruction as string | null;
              if (!instruction) return;

              // Widget at the block's start position (pos). With side:-1
              // the widget appears just before the block element, so it
              // renders as a bar above the block's own content.
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
                  {
                    side: -1,
                    key: `instruction:${pos}:${instruction}`,
                  },
                ),
              );
            });

            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
