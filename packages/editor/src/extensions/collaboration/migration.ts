import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, Transaction } from "@tiptap/pm/state";
import type * as Y from "yjs";

export type MigrationRule = (fragment: Y.XmlFragment, tr: Transaction) => void;

export interface CollaborationMigrationOptions {
  fragment: Y.XmlFragment | null;
  rules: MigrationRule[];
}

export const CollaborationMigration = Extension.create<CollaborationMigrationOptions>({
  name: "collaborationMigration",

  addOptions() {
    return {
      fragment: null,
      rules: [],
    };
  },

  addProseMirrorPlugins() {
    let migrationDone = false;
    const pluginKey = new PluginKey("schemaMigration");
    const { fragment, rules } = this.options;

    if (!fragment) {
      return [];
    }

    return [
      new Plugin({
        key: pluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (migrationDone) {
            return undefined;
          }

          // Yjs sync transactions have the "y-sync$" meta key
          const isYSync = transactions.some((tr) => tr.getMeta("y-sync$"));
          const isDocChanged = transactions.some((tr) => tr.docChanged);

          if (!isYSync || !isDocChanged || !fragment.firstChild) {
            return undefined;
          }

          const tr = newState.tr;
          for (const rule of rules) {
            rule(fragment, tr);
          }

          migrationDone = true;

          if (!tr.docChanged) {
            return undefined;
          }

          return tr;
        },
      }),
    ];
  },
});
