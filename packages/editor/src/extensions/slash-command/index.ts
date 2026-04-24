import type { EditorExtensionContext, EditorExtensionModule } from "../../core/types";
import { SlashCommand, type SlashCommandItem } from "./SlashCommand";

/**
 * Default command list. Hosts that need custom blocks (comments,
 * embeds, AI actions) pass their own via `features.slashCommand.items`.
 */
export function defaultSlashCommands(
  ctx: EditorExtensionContext,
): SlashCommandItem[] {
  const items: SlashCommandItem[] = [
    {
      id: "h1",
      title: "Heading 1",
      description: "Large section heading",
      keywords: ["title", "h1", "#"],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run(),
    },
    {
      id: "h2",
      title: "Heading 2",
      description: "Medium section heading",
      keywords: ["h2", "##"],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run(),
    },
    {
      id: "h3",
      title: "Heading 3",
      description: "Subsection heading",
      keywords: ["h3", "###"],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run(),
    },
    {
      id: "bullet-list",
      title: "Bulleted list",
      description: "Unordered list of items",
      keywords: ["bullet", "list", "ul", "-"],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      id: "ordered-list",
      title: "Numbered list",
      description: "1. 2. 3. ordered list",
      keywords: ["number", "ordered", "ol"],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      id: "task-list",
      title: "Task list",
      description: "Checkbox to-do list",
      keywords: ["todo", "task", "check"],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      id: "quote",
      title: "Quote",
      description: "Blockquote callout",
      keywords: ["quote", "blockquote", ">"],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      id: "code",
      title: "Code block",
      description: "Fenced monospace block",
      keywords: ["code", "pre", "```"],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      id: "divider",
      title: "Divider",
      description: "Horizontal separator",
      keywords: ["hr", "rule", "line", "---"],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
  ];

  // Authoring-only: inserting a locked block from a document would
  // be rejected by the policy anyway; hide it from the menu to match.
  if (ctx.mode === "template") {
    items.push({
      id: "locked-block",
      title: "Locked section",
      description: "Policy-controlled block — read-only in documents",
      keywords: ["lock", "locked", "readonly", "policy"],
      run: (editor, range) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setLockedBlock({ mode: "locked", reason: "Policy-controlled section" })
          .run(),
    });
    items.push({
      id: "instructed-paragraph",
      title: "Block with instruction",
      description: "Paragraph with an author-facing instruction on top",
      keywords: ["instruction", "guidance", "help", "hint", "note"],
      run: (editor, range) => {
        const text =
          typeof window !== "undefined"
            ? (window.prompt("Instruction for this block", "") ?? "").trim()
            : "";
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .command(({ tr, state, dispatch }) => {
            const paragraphType = state.schema.nodes.paragraph;
            if (!paragraphType) return false;
            const attrs = text ? { instruction: text } : null;
            const node = paragraphType.createAndFill(attrs);
            if (!node) return false;
            tr.replaceSelectionWith(node);
            if (dispatch) dispatch(tr);
            return true;
          })
          .run();
      },
    });
  }

  return items;
}

export interface SlashCommandFeatureConfig {
  /** Replace the default command set entirely. */
  items?: SlashCommandItem[];
  /** Append additional commands to the defaults. */
  extraItems?: SlashCommandItem[];
  enabled?: boolean;
}

function getConfig(features: Record<string, unknown>): SlashCommandFeatureConfig {
  const raw = features.slashCommand;
  if (!raw || typeof raw !== "object") return {};
  return raw as SlashCommandFeatureConfig;
}

export const slashCommandModule: EditorExtensionModule = {
  id: "slash-command",
  name: "Slash command palette",
  description:
    "Notion-style `/` palette for inserting blocks. The default command set is produced from the current editor context; hosts can replace or extend it via `features.slashCommand`.",
  tiptap: (ctx) => {
    const cfg = getConfig(ctx.features);
    const items =
      cfg.items ?? [...defaultSlashCommands(ctx), ...(cfg.extraItems ?? [])];
    return [
      SlashCommand.configure({
        items,
        enabled: cfg.enabled ?? true,
      }),
    ];
  },
};

export * from "./SlashCommand";
