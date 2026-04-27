import type { EditorExtensionModule } from "../../core/types";
import { EditableField } from "./EditableField";

export const editableFieldModule: EditorExtensionModule = {
  id: "editable-field",
  name: "Editable field wrapper",
  description:
    "Block wrapper marking a free-form rich-text region the end user is meant to fill in. Content inside is editable in document mode; the wrapper itself is immovable and undeletable.",
  tiptap: (ctx) => [EditableField.configure({ editorMode: ctx.mode })],
  toolbar: (ctx) => {
    if (ctx.mode !== "template") return [];
    return [
      {
        kind: "button",
        id: "wrapEditableField",
        label: "✎ Editable",
        title: "Wrap the current selection in an editable region",
        isActive: (editor) => editor.isActive("editableField"),
        onRun: (editor) => {
          if (editor.isActive("editableField")) {
            editor.chain().focus().unsetEditableField().run();
          } else {
            editor.chain().focus().setEditableField().run();
          }
        },
      },
    ];
  },
};

export * from "./EditableField";
