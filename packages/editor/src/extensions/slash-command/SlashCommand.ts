import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface SlashCommandItem {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
  icon?: string;
  /**
   * Mutates the editor to realise the command. `range` covers the
   * trigger text (`/query`) so the command can replace it with the
   * target block.
   */
  run: (editor: Editor, range: { from: number; to: number }) => void;
}

export interface SlashCommandOptions {
  items: SlashCommandItem[];
  /** Max number of items shown at once. */
  limit?: number;
  /** Opt into or out of the menu entirely (driven by editor mode). */
  enabled?: boolean;
}

interface SlashState {
  active: boolean;
  from: number;
  to: number;
  query: string;
  selectedIndex: number;
}

const slashKey = new PluginKey<SlashState>("slashCommand");

const STYLE_TAG_ID = "tpe-slash-style";
const STYLE_RULES = `
.tpe-slash-menu {
  position: absolute;
  z-index: 50;
  display: none;
  min-width: 260px;
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
  background: var(--bg, #fff);
  border: 1px solid var(--border, #e8e8e5);
  border-radius: 8px;
  box-shadow: var(--shadow-md, 0 8px 24px rgba(0,0,0,0.08));
  font-size: 13px;
}
.tpe-slash-menu[data-visible="true"] { display: block; }
.tpe-slash-menu-empty {
  padding: 16px;
  color: var(--fg-muted, #6b6b68);
  text-align: center;
}
.tpe-slash-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--fg, #1f1f1c);
}
.tpe-slash-item[data-active="true"] {
  background: var(--bg-subtle, #f2f2ef);
}
.tpe-slash-item .tpe-slash-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border: 1px solid var(--border, #e8e8e5);
  border-radius: 5px;
  background: var(--bg, #fff);
  color: var(--fg-muted, #6b6b68);
  font-weight: 600;
  font-size: 11px;
}
.tpe-slash-title {
  font-weight: 500;
  line-height: 1.2;
}
.tpe-slash-desc {
  font-size: 11px;
  color: var(--fg-muted, #6b6b68);
  margin-top: 2px;
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
 * Slash-command palette.
 *
 * Triggered by `/` at the start of an empty paragraph (or when
 * preceded only by whitespace). The menu filters by prefix/keyword,
 * arrow keys navigate, Enter runs, Escape closes.
 *
 * The extension owns the detection + rendering; the *commands* are
 * contributed via `items`. Adding a new command (comment, AI, embed)
 * is an options change, not a code edit here.
 */
export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      items: [],
      limit: 10,
      enabled: true,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    if (!options.enabled || options.items.length === 0) return [];
    const editor = this.editor;

    return [createSlashPlugin(options, editor)];
  },
});

function createSlashPlugin(
  options: SlashCommandOptions,
  editor: Editor,
): Plugin<SlashState> {
  const runItem = (
    view: import("@tiptap/pm/view").EditorView,
    item: SlashCommandItem | undefined,
  ) => {
    const state = slashKey.getState(view.state);
    if (!state?.active || !item) return;
    const { from, to } = state;
    view.dispatch(view.state.tr.setMeta(slashKey, emptyState()));
    item.run(editor, { from, to });
  };

  return new Plugin<SlashState>({
    key: slashKey,
    state: {
      init: () => emptyState(),
      apply(tr, value, _oldState, newState) {
        const meta = tr.getMeta(slashKey) as Partial<SlashState> | undefined;
        if (meta) return { ...value, ...meta };
        if (!tr.docChanged && tr.selection.eq(newState.selection)) return value;
        return detectSlash(newState) ?? emptyState();
      },
    },
    view(view) {
      ensureStyles();
      const menu = document.createElement("div");
      menu.className = "tpe-slash-menu";
      menu.setAttribute("data-visible", "false");
      document.body.appendChild(menu);

      let filteredItems: SlashCommandItem[] = [];

      const render = () => {
        const state = slashKey.getState(view.state);
        if (!state?.active) {
          menu.setAttribute("data-visible", "false");
          return;
        }
        filteredItems = filterItems(options.items, state.query, options.limit ?? 10);
        renderMenuContents(menu, filteredItems, state.selectedIndex);
        positionMenu(menu, view, state.from);
        menu.setAttribute("data-visible", "true");
      };

      const onClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        const itemEl = target?.closest<HTMLElement>("[data-slash-index]");
        if (!itemEl) return;
        const index = Number(itemEl.getAttribute("data-slash-index"));
        if (!Number.isFinite(index)) return;
        runItem(view, filteredItems[index]);
        event.preventDefault();
      };

      menu.addEventListener("mousedown", onClick);

      return {
        update: render,
        destroy() {
          menu.removeEventListener("mousedown", onClick);
          menu.remove();
        },
      };
    },
    props: {
      handleKeyDown(view, event) {
        const state = slashKey.getState(view.state);
        if (!state?.active) return false;
        const filtered = filterItems(
          options.items,
          state.query,
          options.limit ?? 10,
        );
        if (filtered.length === 0) {
          if (event.key === "Escape") {
            view.dispatch(view.state.tr.setMeta(slashKey, emptyState()));
            return true;
          }
          return false;
        }
        if (event.key === "ArrowDown") {
          const next = (state.selectedIndex + 1) % filtered.length;
          view.dispatch(view.state.tr.setMeta(slashKey, { selectedIndex: next }));
          return true;
        }
        if (event.key === "ArrowUp") {
          const next =
            (state.selectedIndex - 1 + filtered.length) % filtered.length;
          view.dispatch(view.state.tr.setMeta(slashKey, { selectedIndex: next }));
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          runItem(view, filtered[state.selectedIndex]);
          event.preventDefault();
          return true;
        }
        if (event.key === "Escape") {
          view.dispatch(view.state.tr.setMeta(slashKey, emptyState()));
          return true;
        }
        return false;
      },
    },
  });
}

function emptyState(): SlashState {
  return { active: false, from: 0, to: 0, query: "", selectedIndex: 0 };
}

function detectSlash(state: import("@tiptap/pm/state").EditorState): SlashState | null {
  const { selection } = state;
  if (!selection.empty) return null;
  const $from = selection.$from;
  if ($from.parent.type.name !== "paragraph") return null;

  const parentText = $from.parent.textBetween(
    0,
    $from.parentOffset,
    "\ufffc",
    "\ufffc",
  );
  // `/` must be at the start of the paragraph's text (possibly after
  // whitespace) — avoids triggering inside a URL or code sample.
  const match = /(?:^|^\s*)\/([\w-]{0,40})$/.exec(parentText);
  if (!match) return null;
  const slashStart = $from.pos - match[0].trimStart().length;
  const to = $from.pos;
  return {
    active: true,
    from: slashStart,
    to,
    query: match[1] ?? "",
    selectedIndex: 0,
  };
}

function filterItems(
  items: SlashCommandItem[],
  query: string,
  limit: number,
): SlashCommandItem[] {
  if (!query) return items.slice(0, limit);
  const q = query.toLowerCase();
  return items
    .filter((it) => {
      const hay = [it.title, ...(it.keywords ?? [])].join(" ").toLowerCase();
      return hay.includes(q);
    })
    .slice(0, limit);
}

function renderMenuContents(
  menu: HTMLElement,
  items: SlashCommandItem[],
  activeIndex: number,
) {
  if (items.length === 0) {
    menu.innerHTML = `<div class="tpe-slash-menu-empty">No matching commands</div>`;
    return;
  }
  menu.innerHTML = items
    .map((item, index) => {
      const active = index === activeIndex ? "true" : "false";
      const icon = item.icon ?? defaultIcon(item.title);
      const desc = item.description
        ? `<div class="tpe-slash-desc">${escapeHtml(item.description)}</div>`
        : "";
      return `
<div class="tpe-slash-item" data-slash-index="${index}" data-active="${active}">
  <span class="tpe-slash-icon">${icon}</span>
  <div>
    <div class="tpe-slash-title">${escapeHtml(item.title)}</div>
    ${desc}
  </div>
</div>`;
    })
    .join("");
}

function positionMenu(
  menu: HTMLElement,
  view: import("@tiptap/pm/view").EditorView,
  from: number,
) {
  const coords = view.coordsAtPos(from);
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  menu.style.top = `${coords.bottom + scrollY + 6}px`;
  menu.style.left = `${coords.left + scrollX}px`;
}

function defaultIcon(title: string): string {
  const letter = (title[0] ?? "?").toUpperCase();
  return `<span>${escapeHtml(letter)}</span>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}
