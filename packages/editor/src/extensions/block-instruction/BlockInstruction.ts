import { Extension } from "@tiptap/core";

const STYLE_TAG_ID = "tpe-block-instruction-style";
const STYLE_RULES = `
.ProseMirror [data-instruction]::before {
  content: "💡 " attr(data-instruction);
  display: block;
  font-size: 12px;
  line-height: 1.45;
  color: var(--fg-muted, #6b6b68);
  background: var(--instruction-bg, rgba(255, 215, 100, 0.16));
  border-left: 3px solid var(--instruction-accent, #e6c96f);
  padding: 6px 10px;
  border-radius: 0 6px 6px 0;
  margin: 0 0 8px;
  user-select: none;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
}
.ProseMirror pre[data-instruction]::before {
  margin-bottom: 10px;
  border-radius: 0;
  border-top-right-radius: 6px;
}
.ProseMirror blockquote[data-instruction] {
  margin-left: 0;
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
 * any top-level block with a one-line instruction. The instruction
 * text is stored as a node attribute and surfaces as a `::before`
 * helper panel above the block - no React integration, no decorations,
 * no extra node wrappers. The attribute serialises to
 * `data-instruction` so it round-trips through HTML content.
 *
 * The guardrail (only template authors can set it) lives in
 * `BlockHandle`; this extension is the pure storage layer.
 */
export const BlockInstruction = Extension.create({
  name: "blockInstruction",

  onCreate() {
    ensureStyles();
  },

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
});
