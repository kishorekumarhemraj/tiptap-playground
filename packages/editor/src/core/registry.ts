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
  const seen = new Map<string, string>(); // extensionName → moduleId
  const out: AnyExtension[] = [];
  for (const mod of activeModules(modules, ctx)) {
    for (const ext of mod.tiptap?.(ctx) ?? []) {
      const owner = seen.get(ext.name);
      if (owner) {
        console.warn(
          `[editor] Extension name conflict: "${ext.name}" from module "${mod.id}" ` +
            `is already registered by module "${owner}". The second registration is ignored. ` +
            "Check that two modules are not providing the same TipTap extension.",
        );
        continue;
      }
      seen.set(ext.name, mod.id);
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
