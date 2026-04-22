import type { AnyExtension } from "@tiptap/react";
import type {
  EditorExtensionContext,
  EditorExtensionModule,
  ToolbarItem,
} from "./types";

/**
 * Resolves a list of modules against a shared context, filtering out
 * any that declare themselves disabled. Separated from the actual
 * extension/toolbar assembly so the same filter runs once per render.
 */
function activeModules(
  modules: EditorExtensionModule[],
  ctx: EditorExtensionContext,
): EditorExtensionModule[] {
  return modules.filter((m) => (m.enabled ? m.enabled(ctx) : true));
}

export function buildTiptapExtensions(
  modules: EditorExtensionModule[],
  ctx: EditorExtensionContext,
): AnyExtension[] {
  const seen = new Set<string>();
  const out: AnyExtension[] = [];
  for (const mod of activeModules(modules, ctx)) {
    const contributed = mod.tiptap?.(ctx) ?? [];
    for (const ext of contributed) {
      // TipTap will crash loudly if two extensions share a name, so we
      // dedupe up-front and let the first registration win.
      const name = ext.name;
      if (seen.has(name)) continue;
      seen.add(name);
      out.push(ext);
    }
  }
  return out;
}

export function buildToolbarItems(
  modules: EditorExtensionModule[],
  ctx: EditorExtensionContext,
): ToolbarItem[] {
  const items: ToolbarItem[] = [];
  for (const mod of activeModules(modules, ctx)) {
    const contributed = mod.toolbar?.(ctx) ?? [];
    if (items.length > 0 && contributed.length > 0) {
      items.push({ kind: "divider", id: `divider-${mod.id}` });
    }
    items.push(...contributed);
  }
  return items;
}
