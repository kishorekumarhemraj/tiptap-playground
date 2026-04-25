import { Node, mergeAttributes } from "@tiptap/core";
import { generateNodeId } from "../../core/ids";

export interface SectionAttrs {
  /** Stable per-instance id, preserved across copy/paste & versioning. */
  id: string;
  /** Optional section heading shown above the content. */
  title: string | null;
  /** Optional one-line guidance for the end user. */
  instruction: string | null;
  /**
   * When `true`, end users may add / remove / reorder blocks inside
   * this section in document mode. Blocks added by users carry the
   * global `userOrigin: true` attribute and are fully editable; the
   * template's original blocks remain frozen.
   */
  mutableContent: boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    section: {
      setSection: (attrs?: Partial<SectionAttrs>) => ReturnType;
      unsetSection: () => ReturnType;
      updateSection: (attrs: Partial<SectionAttrs>) => ReturnType;
    };
  }
}

/**
 * Block-level container that groups paragraphs, fields, and other
 * blocks into a named region of the template. Sections have a stable
 * id, an optional title and instruction, and a `mutableContent` flag
 * that decides whether the end user may add blocks inside the section
 * in document mode.
 *
 * The structural rules (frame is immovable in document mode; inserts
 * obey `mutableContent`) live in the `TemplateStructureGuard` plugin,
 * not here. This file owns schema + commands only.
 */
export const Section = Node.create({
  name: "section",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      id: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-id"),
        renderHTML: (attrs) => (attrs.id ? { "data-id": attrs.id } : {}),
      },
      title: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-title"),
        renderHTML: (attrs) =>
          attrs.title ? { "data-title": attrs.title } : {},
      },
      instruction: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-instruction"),
        renderHTML: (attrs) =>
          attrs.instruction ? { "data-instruction": attrs.instruction } : {},
      },
      mutableContent: {
        default: false,
        parseHTML: (el) =>
          el.getAttribute("data-mutable-content") === "true",
        renderHTML: (attrs) =>
          attrs.mutableContent ? { "data-mutable-content": "true" } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-type='section']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-type": "section" }),
      0,
    ];
  },

  addCommands() {
    return {
      setSection:
        (attrs = {}) =>
        ({ commands }) => {
          const target: SectionAttrs = {
            id: generateNodeId("sec"),
            title: null,
            instruction: null,
            mutableContent: false,
            ...attrs,
          };
          return commands.wrapIn(this.name, target);
        },

      unsetSection:
        () =>
        ({ commands }) =>
          commands.lift(this.name),

      updateSection:
        (attrs) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    };
  },
});
