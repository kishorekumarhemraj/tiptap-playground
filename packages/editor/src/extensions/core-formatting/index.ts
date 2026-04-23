import StarterKit from "@tiptap/starter-kit";
import { Placeholder, CharacterCount } from "@tiptap/extensions";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import type { EditorExtensionModule } from "../../core/types";

/**
 * StarterKit in TipTap 3 bundles: Document, Paragraph, Text, Heading,
 * Bold, Italic, Underline, Strike, Code, CodeBlock, Blockquote,
 * HardBreak, HorizontalRule, Link, BulletList, OrderedList, ListItem,
 * ListKeymap, Dropcursor, Gapcursor, History (UndoRedo).
 * Anything not in that list is added explicitly below.
 */
export const coreFormattingModule: EditorExtensionModule = {
  id: "core-formatting",
  name: "Core formatting",
  description:
    "StarterKit plus Notion-style formatting (highlights, alignment, tasks, typography, placeholders).",
  tiptap: (ctx) => [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      },
      // Yjs supplies its own undo/redo via Y.UndoManager. Running both
      // ProseMirror history and Yjs history at the same time corrupts
      // the undo stack, so we drop the StarterKit one when collab is on.
      undoRedo: ctx.drivers.collaboration ? false : undefined,
    }),
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Typography,
    TaskList,
    TaskItem.configure({ nested: true }),
    Subscript,
    Superscript,
    CharacterCount,
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") return "Heading";
        return "Type '/' for commands, or just start writing…";
      },
    }),
  ],
  toolbar: () => [
    {
      kind: "button",
      id: "bold",
      label: "B",
      title: "Bold (⌘B)",
      isActive: (editor) => editor.isActive("bold"),
      onRun: (editor) => editor.chain().focus().toggleBold().run(),
    },
    {
      kind: "button",
      id: "italic",
      label: "I",
      title: "Italic (⌘I)",
      isActive: (editor) => editor.isActive("italic"),
      onRun: (editor) => editor.chain().focus().toggleItalic().run(),
    },
    {
      kind: "button",
      id: "underline",
      label: "U",
      title: "Underline (⌘U)",
      isActive: (editor) => editor.isActive("underline"),
      onRun: (editor) => editor.chain().focus().toggleUnderline().run(),
    },
    {
      kind: "button",
      id: "strike",
      label: "S",
      title: "Strikethrough",
      isActive: (editor) => editor.isActive("strike"),
      onRun: (editor) => editor.chain().focus().toggleStrike().run(),
    },
    {
      kind: "button",
      id: "code",
      label: "</>",
      title: "Inline code",
      isActive: (editor) => editor.isActive("code"),
      onRun: (editor) => editor.chain().focus().toggleCode().run(),
    },
    {
      kind: "button",
      id: "h1",
      label: "H1",
      isActive: (editor) => editor.isActive("heading", { level: 1 }),
      onRun: (editor) =>
        editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      kind: "button",
      id: "h2",
      label: "H2",
      isActive: (editor) => editor.isActive("heading", { level: 2 }),
      onRun: (editor) =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      kind: "button",
      id: "h3",
      label: "H3",
      isActive: (editor) => editor.isActive("heading", { level: 3 }),
      onRun: (editor) =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      kind: "button",
      id: "bulletList",
      label: "• List",
      isActive: (editor) => editor.isActive("bulletList"),
      onRun: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      kind: "button",
      id: "orderedList",
      label: "1. List",
      isActive: (editor) => editor.isActive("orderedList"),
      onRun: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      kind: "button",
      id: "taskList",
      label: "☑ Tasks",
      isActive: (editor) => editor.isActive("taskList"),
      onRun: (editor) => editor.chain().focus().toggleTaskList().run(),
    },
    {
      kind: "button",
      id: "blockquote",
      label: "❝",
      title: "Blockquote",
      isActive: (editor) => editor.isActive("blockquote"),
      onRun: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      kind: "button",
      id: "codeBlock",
      label: "{ }",
      title: "Code block",
      isActive: (editor) => editor.isActive("codeBlock"),
      onRun: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      kind: "button",
      id: "hr",
      label: "—",
      title: "Horizontal rule",
      onRun: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
  ],
};
