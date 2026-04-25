import { Node, mergeAttributes } from "@tiptap/core";
import { generateNodeId } from "../../core/ids";

export interface EditableFieldAttrs {
  /** Stable per-instance id, preserved across copy/paste & versioning. */
  id: string;
  /** Optional one-line guidance shown above the editable region. */
  instruction: string | null;
  /** Optional placeholder shown when the region is empty. */
  placeholder: string | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    editableField: {
      setEditableField: (attrs?: Partial<EditableFieldAttrs>) => ReturnType;
      unsetEditableField: () => ReturnType;
      updateEditableField: (
        attrs: Partial<EditableFieldAttrs>,
      ) => ReturnType;
    };
  }
}

/**
 * Block-level wrapper marking a region of the template the end user
 * is meant to fill in. Content inside is fully rich-text editable in
 * document mode; the wrapper itself is immovable and undeletable
 * (enforced by `TemplateStructureGuard`).
 *
 * Inline plain-text fillables are not handled here — those are
 * rendered by `field` nodes with a host-supplied input control.
 */
export const EditableField = Node.create({
  name: "editableField",
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
      instruction: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-instruction"),
        renderHTML: (attrs) =>
          attrs.instruction ? { "data-instruction": attrs.instruction } : {},
      },
      placeholder: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-placeholder"),
        renderHTML: (attrs) =>
          attrs.placeholder ? { "data-placeholder": attrs.placeholder } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='editable-field']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "editable-field" }),
      0,
    ];
  },

  addCommands() {
    return {
      setEditableField:
        (attrs = {}) =>
        ({ commands }) => {
          const target: EditableFieldAttrs = {
            id: generateNodeId("ef"),
            instruction: null,
            placeholder: null,
            ...attrs,
          };
          return commands.wrapIn(this.name, target);
        },

      unsetEditableField:
        () =>
        ({ commands }) =>
          commands.lift(this.name),

      updateEditableField:
        (attrs) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    };
  },
});
