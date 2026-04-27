"use client";

import {
  defaultComputePositionConfig,
  DragHandlePlugin,
  dragHandlePluginDefaultKey,
  normalizeNestedOptions,
} from "@tiptap/extension-drag-handle";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useEffect } from "react";
import styles from "./DragHandle.module.css";

// The @tiptap/extension-drag-handle-react wrapper renders a div via React and
// then physically moves it outside the React tree (wrapper.appendChild →
// editorParent.appendChild). This breaks React's DOM invariants: React tries
// insertBefore / removeChild using that node as a reference, but the node is
// no longer where React expects it, causing NotFoundError crashes.
//
// Fix: create the handle element imperatively (never in the React tree) and
// register the DragHandlePlugin directly. React returns null from this
// component, so it never manages the element and can never conflict with the
// plugin's DOM operations.

export interface TemplateDragHandleProps {
  editor: TiptapEditor | null;
  /** When false the plugin is not registered and the handle is invisible. */
  active: boolean;
}

export function TemplateDragHandle({ editor, active }: TemplateDragHandleProps) {
  useEffect(() => {
    if (!active || !editor || editor.isDestroyed) return;

    const element = document.createElement("div");
    element.className = "drag-handle";
    element.setAttribute("aria-label", "Drag block");

    const inner = document.createElement("div");
    inner.className = styles.handle;
    inner.innerHTML = `<svg viewBox="0 0 12 14" fill="none" aria-hidden="true">
      <circle cx="3.5" cy="3" r="1.1" fill="currentColor"/>
      <circle cx="8.5" cy="3" r="1.1" fill="currentColor"/>
      <circle cx="3.5" cy="7" r="1.1" fill="currentColor"/>
      <circle cx="8.5" cy="7" r="1.1" fill="currentColor"/>
      <circle cx="3.5" cy="11" r="1.1" fill="currentColor"/>
      <circle cx="8.5" cy="11" r="1.1" fill="currentColor"/>
    </svg>`;
    element.appendChild(inner);

    const initPlugin = DragHandlePlugin({
      editor,
      element,
      pluginKey: dragHandlePluginDefaultKey,
      computePositionConfig: {
        ...defaultComputePositionConfig,
        placement: "left-start",
        strategy: "absolute",
      },
      nestedOptions: normalizeNestedOptions(true),
    });

    editor.registerPlugin(initPlugin.plugin);

    return () => {
      editor.unregisterPlugin(dragHandlePluginDefaultKey);
      initPlugin.unbind();
    };
  }, [active, editor]);

  return null;
}
