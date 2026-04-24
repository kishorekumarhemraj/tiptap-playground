import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const instructionKey = new PluginKey("blockInstruction");

const STYLE_TAG_ID = "tpe-block-instruction-style";
const STYLE_RULES = `
.tpe-instruction-widget {
  display: block;
  font-size: 12px;
  line-height: 1.45;
  color: var(--fg-muted, #6b6b68);
  background: var(--instruction-bg, rgba(255, 215, 100, 0.16));
  border-left: 3px solid var(--instruction-accent, #e6c96f);
  padding: 6px 10px;
  border-radius: 0 6px 6px 0;
  margin: 0 0 4px;
  user-select: none;
  pointer-events: none;
  font-style: normal;
  font-weight: 400;
}
`;

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = STYLE_RULES;
  document.head.appendChild(style);
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

  addProseMirrorPlugins() {
    ensureStyles();

    return [
      new Plugin({
        key: instructionKey,
        props: {
          decorations(state) {
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
