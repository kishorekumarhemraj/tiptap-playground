import { IconMultiColumn } from "../../react/icons";
import type { EditorExtensionModule } from "../../core/types";
import { Column } from "./ColumnNode";
import { ColumnList } from "./ColumnListNode";
import { ColumnResizeExtension } from "./ColumnResizePlugin";

export const multiColumnModule: EditorExtensionModule = {
  id: "multi-column",
  name: "Multi-column layout",
  description: "Side-by-side columns with drag-to-resize.",

  tiptap: () => [Column, ColumnList, ColumnResizeExtension],

  toolbar: () => [
    { kind: "divider", id: "multi-column-divider" },
    {
      kind: "button",
      id: "insertColumns",
      label: "2 Columns",
      title: "Insert Two-Column Layout",
      icon: IconMultiColumn(),
      onRun: (editor) => {
        const makeId = () =>
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2);
        editor
          .chain()
          .focus()
          .insertContent({
            type: "columnList",
            content: [
              {
                type: "column",
                attrs: { width: 1, colId: makeId() },
                content: [{ type: "paragraph" }],
              },
              {
                type: "column",
                attrs: { width: 1, colId: makeId() },
                content: [{ type: "paragraph" }],
              },
            ],
          })
          .run();
      },
    },
  ],
};

export { Column } from "./ColumnNode";
export { ColumnList } from "./ColumnListNode";
export { ColumnResizeExtension } from "./ColumnResizePlugin";
