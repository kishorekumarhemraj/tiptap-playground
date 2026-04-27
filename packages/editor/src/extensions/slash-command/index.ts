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

  // Authoring-only entries. Documents can't add structural elements
  // anyway — the structure guard would reject them — so we hide them
  // from the menu to match.
  if (ctx.mode === "template") {
    items.push({
      id: "section",
      title: "Section",
      description: "Container for grouping blocks into a named region",
      keywords: ["section", "group", "container", "region"],
      run: (editor, range) => {
        const title =
          typeof window !== "undefined"
            ? (window.prompt("Section title (optional)", "") ?? "").trim()
            : "";
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setSection(title ? { title } : {})
          .run();
      },
    });
    items.push({
      id: "editable-field",
      title: "Editable region",
      description: "Free-form area the end user fills in",
      keywords: ["editable", "field", "fill", "input", "region"],
      run: (editor, range) => {
        const instruction =
          typeof window !== "undefined"
            ? (window.prompt(
                "Instruction for this editable region (optional)",
                "",
              ) ?? "").trim()
            : "";
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setEditableField(instruction ? { instruction } : {})
          .run();
      },
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

    // One slash entry per registered field definition. The picker
    // pulls definitions synchronously from the registry — async
    // (HTTP-backed) registries should pre-warm via subscribe before
    // authoring opens, otherwise items appear after the next render.
    const fields = ctx.drivers.fields;
    if (fields) {
      const result = fields.list();
      const defs = Array.isArray(result) ? result : [];
      for (const def of defs) {
        items.push({
          id: `field:${def.id}`,
          title: def.label,
          description:
            def.instruction ?? `Insert a ${def.kind} field`,
          keywords: ["field", def.kind, def.id, def.label.toLowerCase()],
          icon: fieldIcon(def.kind),
          run: (editor, range) =>
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertField({ fieldId: def.id })
              .run(),
        });
      }
    }
  }

  return items;
}

function fieldIcon(kind: string): string {
  // Tiny inline SVG keyed off the kind so the slash menu can hint
  // at the control type. Falls back to a generic chip.
  const stroke = `stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  switch (kind) {
    case "select":
    case "multiSelect":
      return `<svg viewBox="0 0 16 16" ${stroke}><path d="M3 6l5 4 5-4"/></svg>`;
    case "date":
      return `<svg viewBox="0 0 16 16" ${stroke}><rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/></svg>`;
    case "number":
      return `<svg viewBox="0 0 16 16" ${stroke}><path d="M3 5h10M3 11h10M6 2L5 14M11 2l-1 12"/></svg>`;
    case "boolean":
      return `<svg viewBox="0 0 16 16" ${stroke}><rect x="2.5" y="4.5" width="11" height="7" rx="3.5"/><circle cx="11" cy="8" r="2.5" fill="currentColor"/></svg>`;
    default:
      return `<svg viewBox="0 0 16 16" ${stroke}><rect x="2.5" y="5.5" width="11" height="5" rx="1.2"/></svg>`;
  }
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
