import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { EditableFieldView } from "./EditableFieldView";
import { generateNodeId } from "../../core/ids";
import type { EditorMode } from "../../core/types";

export interface EditableFieldAttrs {
  /** Stable per-instance id, preserved across copy/paste & versioning. */
  id: string;
  /** Optional one-line guidance shown above the editable region. */
  instruction: string | null;
  /** Optional placeholder shown when the region is empty. */
  placeholder: string | null;
}

export interface EditableFieldExtensionOptions {
  editorMode?: EditorMode;
}

export interface EditableFieldExtensionStorage {
  editorMode: EditorMode;
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
  interface Storage {
    editableField: EditableFieldExtensionStorage;
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
export const EditableField = Node.create<
  EditableFieldExtensionOptions,
  EditableFieldExtensionStorage
>({
  name: "editableField",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addOptions() {
    return {};
  },

  addStorage(): EditableFieldExtensionStorage {
    return { editorMode: this.options.editorMode ?? "document" };
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditableFieldView);
  },

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
        ({ state, dispatch }) => {
          const type = this.type;
          const { $from } = state.selection;
          for (let d = $from.depth; d >= 0; d--) {
            if ($from.node(d).type === type) {
              const node = $from.node(d);
              const pos = $from.before(d);
              if (dispatch) {
                dispatch(
                  state.tr.replaceWith(pos, pos + node.nodeSize, node.content),
                );
              }
              return true;
            }
          }
          return false;
        },

      updateEditableField:
        (attrs) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    };
  },
});
