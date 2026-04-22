import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { LockedBlockView } from "./LockedBlockView";

export type LockMode = "locked" | "readonly" | "conditional";

export interface LockedBlockAttrs {
  mode: LockMode;
  reason: string | null;
  /**
   * For `conditional` blocks: a JS-ish expression evaluated against
   * the current context (user role, feature flag, etc.). We keep it
   * as a string here; the evaluator lives outside the schema so rules
   * can evolve without a schema migration.
   */
  condition: string | null;
  lockedBy: string | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lockedBlock: {
      /** Wrap the current selection in a locked block. */
      setLockedBlock: (attrs?: Partial<LockedBlockAttrs>) => ReturnType;
      /** Unwrap the surrounding locked block, promoting its content. */
      unsetLockedBlock: () => ReturnType;
      /** Update attributes on the surrounding locked block. */
      updateLockedBlock: (attrs: Partial<LockedBlockAttrs>) => ReturnType;
    };
  }
}

/**
 * A container node whose content is conditionally editable.
 *
 * The schema stores *intent* (mode + reason + condition). The editor
 * is the one that actually enforces the rule - see the `filterTransaction`
 * hook below, which blocks any transaction that would mutate content
 * inside a locked block while the block is not editable.
 */
export const LockedBlock = Node.create({
  name: "lockedBlock",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      mode: {
        default: "locked" as LockMode,
        parseHTML: (el) =>
          (el.getAttribute("data-lock-mode") as LockMode) ?? "locked",
        renderHTML: (attrs) => ({ "data-lock-mode": attrs.mode }),
      },
      reason: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-lock-reason"),
        renderHTML: (attrs) =>
          attrs.reason ? { "data-lock-reason": attrs.reason } : {},
      },
      condition: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-lock-condition"),
        renderHTML: (attrs) =>
          attrs.condition ? { "data-lock-condition": attrs.condition } : {},
      },
      lockedBy: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-locked-by"),
        renderHTML: (attrs) =>
          attrs.lockedBy ? { "data-locked-by": attrs.lockedBy } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='locked-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "locked-block" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LockedBlockView);
  },

  addCommands() {
    return {
      setLockedBlock:
        (attrs = {}) =>
        ({ commands }) =>
          commands.wrapIn(this.name, {
            mode: "locked",
            reason: null,
            condition: null,
            lockedBy: null,
            ...attrs,
          }),
      unsetLockedBlock:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
      updateLockedBlock:
        (attrs) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    };
  },
});
