import StarterKit from "@tiptap/starter-kit";
import { Placeholder, CharacterCount } from "@tiptap/extensions";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconCode,
  IconCodeBlock,
  IconH1,
  IconH2,
  IconH3,
  IconBulletList,
  IconOrderedList,
  IconTaskList,
  IconBlockquote,
  IconHorizontalRule,
  IconUndo,
  IconRedo,
} from "../../react/icons";
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
  toolbar: (ctx) => [
    // ── History ──────────────────────────────────────────────────────────
    // Only show undo/redo when not in collab mode (Yjs manages its own stack)
    ...(ctx.drivers.collaboration
      ? []
      : [
          {
            kind: "button" as const,
            id: "undo",
            label: "Undo",
            title: "Undo (⌘Z)",
            icon: IconUndo(),
            isDisabled: (editor: import("@tiptap/react").Editor) =>
              !editor.can().undo(),
            onRun: (editor: import("@tiptap/react").Editor) =>
              editor.chain().focus().undo().run(),
          },
          {
            kind: "button" as const,
            id: "redo",
            label: "Redo",
            title: "Redo (⌘⇧Z)",
            icon: IconRedo(),
            isDisabled: (editor: import("@tiptap/react").Editor) =>
              !editor.can().redo(),
            onRun: (editor: import("@tiptap/react").Editor) =>
              editor.chain().focus().redo().run(),
          },
          { kind: "divider" as const, id: "history-divider" },
        ]),

    // ── Text style ────────────────────────────────────────────────────────
    {
      kind: "button",
      id: "bold",
      label: "Bold",
      title: "Bold (⌘B)",
      icon: IconBold(),
      isActive: (editor) => editor.isActive("bold"),
      onRun: (editor) => editor.chain().focus().toggleBold().run(),
    },
    {
      kind: "button",
      id: "italic",
      label: "Italic",
      title: "Italic (⌘I)",
      icon: IconItalic(),
      isActive: (editor) => editor.isActive("italic"),
      onRun: (editor) => editor.chain().focus().toggleItalic().run(),
    },
    {
      kind: "button",
      id: "underline",
      label: "Underline",
      title: "Underline (⌘U)",
      icon: IconUnderline(),
      isActive: (editor) => editor.isActive("underline"),
      onRun: (editor) => editor.chain().focus().toggleUnderline().run(),
    },
    {
      kind: "button",
      id: "strike",
      label: "Strikethrough",
      title: "Strikethrough",
      icon: IconStrikethrough(),
      isActive: (editor) => editor.isActive("strike"),
      onRun: (editor) => editor.chain().focus().toggleStrike().run(),
    },
    {
      kind: "button",
      id: "code",
      label: "Inline code",
      title: "Inline code (⌘E)",
      icon: IconCode(),
      isActive: (editor) => editor.isActive("code"),
      onRun: (editor) => editor.chain().focus().toggleCode().run(),
    },

    { kind: "divider", id: "text-style-divider" },

    // ── Headings ──────────────────────────────────────────────────────────
    {
      kind: "button",
      id: "h1",
      label: "Heading 1",
      title: "Heading 1 (⌘⌥1)",
      icon: IconH1(),
      isActive: (editor) => editor.isActive("heading", { level: 1 }),
      onRun: (editor) =>
        editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      kind: "button",
      id: "h2",
      label: "Heading 2",
      title: "Heading 2 (⌘⌥2)",
      icon: IconH2(),
      isActive: (editor) => editor.isActive("heading", { level: 2 }),
      onRun: (editor) =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      kind: "button",
      id: "h3",
      label: "Heading 3",
      title: "Heading 3 (⌘⌥3)",
      icon: IconH3(),
      isActive: (editor) => editor.isActive("heading", { level: 3 }),
      onRun: (editor) =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },

    { kind: "divider", id: "heading-divider" },

    // ── Lists & blocks ────────────────────────────────────────────────────
    {
      kind: "button",
      id: "bulletList",
      label: "Bullet list",
      title: "Bullet list (⌘⇧8)",
      icon: IconBulletList(),
      isActive: (editor) => editor.isActive("bulletList"),
      onRun: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      kind: "button",
      id: "orderedList",
      label: "Numbered list",
      title: "Numbered list (⌘⇧7)",
      icon: IconOrderedList(),
      isActive: (editor) => editor.isActive("orderedList"),
      onRun: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      kind: "button",
      id: "taskList",
      label: "Task list",
      title: "Task list",
      icon: IconTaskList(),
      isActive: (editor) => editor.isActive("taskList"),
      onRun: (editor) => editor.chain().focus().toggleTaskList().run(),
    },
    {
      kind: "button",
      id: "blockquote",
      label: "Blockquote",
      title: "Blockquote (⌘⇧B)",
      icon: IconBlockquote(),
      isActive: (editor) => editor.isActive("blockquote"),
      onRun: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      kind: "button",
      id: "codeBlock",
      label: "Code block",
      title: "Code block (⌘⌥C)",
      icon: IconCodeBlock(),
      isActive: (editor) => editor.isActive("codeBlock"),
      onRun: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      kind: "button",
      id: "hr",
      label: "Divider",
      title: "Insert horizontal divider",
      icon: IconHorizontalRule(),
      onRun: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
  ],
};
