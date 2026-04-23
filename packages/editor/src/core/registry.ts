import type { AnyExtension } from "@tiptap/react";
import type {
  EditorExtensionContext,
  EditorExtensionModule,
  ToolbarItem,
} from "./types";

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
    for (const ext of mod.tiptap?.(ctx) ?? []) {
      if (seen.has(ext.name)) continue;
      seen.add(ext.name);
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
