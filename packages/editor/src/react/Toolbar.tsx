"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { ToolbarItem } from "../core/types";
import styles from "./Toolbar.module.css";

// ─── JS-driven tooltip (portalled to document.body) ────────────────────────
//
// Pure-CSS ::before/::after tooltips cannot escape a flex-sibling's paint
// order: even if .toolbarOuter has z-index:20, a sibling painted later in
// document order (like PagesControls) covers the pseudo-elements.
// Portalling to document.body at position:fixed bypasses all stacking
// context issues, exactly as Floating UI / Tippy.js do.

const TOOLTIP_ID = "tpe-toolbar-tooltip";
const ARROW_ID   = "tpe-toolbar-tooltip-arrow";

function ensureTooltipDom() {
  if (typeof document === "undefined") return null;
  let tip = document.getElementById(TOOLTIP_ID);
  if (!tip) {
    tip = document.createElement("div");
    tip.id = TOOLTIP_ID;
    tip.setAttribute("role", "tooltip");
    // Use design-token CSS variables so the tooltip adapts to light/dark theme.
    // --fg  = near-black in light mode, near-white in dark mode (inverse of bg)
    // --bg  = white/light in light mode, dark in dark mode
    tip.style.cssText = [
      "position:fixed",
      "z-index:9999",
      "padding:4px 8px",
      "background:var(--fg,#1a1a1a)",
      "color:var(--bg,#ffffff)",
      "font-size:11px",
      "font-weight:500",
      "font-family:var(--font-sans,sans-serif)",
      "line-height:1.4",
      "border-radius:var(--radius-md,6px)",
      "box-shadow:0 2px 8px rgba(0,0,0,0.18)",
      "pointer-events:none",
      "white-space:nowrap",
      "opacity:0",
      "transition:opacity 120ms ease,transform 120ms ease",
      "transform:translateY(0)",
      "letter-spacing:0.01em",
    ].join(";");
    document.body.appendChild(tip);
  }
  let arrow = document.getElementById(ARROW_ID);
  if (!arrow) {
    arrow = document.createElement("div");
    arrow.id = ARROW_ID;
    arrow.style.cssText = [
      "position:fixed",
      "z-index:9999",
      "width:0",
      "height:0",
      "pointer-events:none",
      "border-left:5px solid transparent",
      "border-right:5px solid transparent",
      "opacity:0",
      "transition:opacity 120ms ease",
    ].join(";");
    document.body.appendChild(arrow);
  }
  return { tip, arrow };
}

let showTimer: number | undefined;
let hideTimer: number | undefined;

function showTooltip(btn: HTMLElement) {
  if (hideTimer !== undefined) { clearTimeout(hideTimer); hideTimer = undefined; }
  showTimer = window.setTimeout(() => {
    const dom = ensureTooltipDom();
    if (!dom) return;
    const { tip, arrow } = dom;
    const text = btn.getAttribute("data-tooltip") ?? "";
    tip.textContent = text;

    // Measure after setting content so tipW/tipH are accurate.
    // The element stays in the DOM between calls (opacity:0), so offsetWidth
    // is always readable without forcing display:block.
    const ARROW_H = 6;  // height of the CSS border-triangle
    const BTN_GAP = 6;  // gap from button edge to the TIP UNIT (arrow+pill)

    const rect = btn.getBoundingClientRect();
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;

    // Prefer below; fall back above only when there genuinely isn't room below
    // AND there is more room above.
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const unitH = ARROW_H + tipH;
    const goBelow = spaceBelow >= unitH + BTN_GAP + 4 || spaceBelow >= spaceAbove;

    // Horizontal: centre on button, clamped to viewport
    const idealLeft = rect.left + rect.width / 2 - tipW / 2;
    const left = Math.max(8, Math.min(idealLeft, window.innerWidth - tipW - 8));
    const arrowLeft = rect.left + rect.width / 2 - 5; // centre of 10px-wide arrow

    if (goBelow) {
      // Arrow sits immediately above the pill — unit starts at rect.bottom + BTN_GAP
      const arrowTop = rect.bottom + BTN_GAP;
      const tipTop   = arrowTop + ARROW_H; // pill starts right below arrow

      arrow.style.top    = `${arrowTop}px`;
      arrow.style.left   = `${arrowLeft}px`;
      arrow.style.borderBottom = `${ARROW_H}px solid var(--fg,#1a1a1a)`;
      arrow.style.borderTop    = "none";

      tip.style.top  = `${tipTop}px`;
      tip.style.left = `${left}px`;
    } else {
      // Arrow sits immediately below the pill — unit bottom at rect.top - BTN_GAP
      const arrowBottom = rect.top - BTN_GAP;
      const arrowTop    = arrowBottom - ARROW_H;
      const tipTop      = Math.max(8, arrowTop - tipH); // pill sits above arrow

      arrow.style.top    = `${arrowTop}px`;
      arrow.style.left   = `${arrowLeft}px`;
      arrow.style.borderTop    = `${ARROW_H}px solid var(--fg,#1a1a1a)`;
      arrow.style.borderBottom = "none";

      tip.style.top  = `${tipTop}px`;
      tip.style.left = `${left}px`;
    }

    // Animate in
    tip.style.opacity   = "0";
    tip.style.transform = goBelow ? "translateY(-3px)" : "translateY(3px)";
    arrow.style.opacity = "0";
    // Force a reflow so the CSS transition fires from the above values
    void tip.offsetWidth;
    tip.style.opacity   = "1";
    tip.style.transform = "translateY(0)";
    arrow.style.opacity = "1";
  }, 250);
}

function hideTooltip() {
  if (showTimer !== undefined) { clearTimeout(showTimer); showTimer = undefined; }
  hideTimer = window.setTimeout(() => {
    const tip   = document.getElementById(TOOLTIP_ID);
    const arrow = document.getElementById(ARROW_ID);
    if (tip)   { tip.style.opacity = "0"; }
    if (arrow) { arrow.style.opacity = "0"; }
  }, 80);
}

export interface ToolbarProps {
  editor: Editor | null;
  items: ToolbarItem[];
  className?: string;
}

/**
 * Stateless toolbar renderer.
 *
 * Design principles:
 * - 28×28 px icon-only buttons; text labels only where no icon is provided.
 * - CSS-driven tooltips via `data-tooltip` — no JS, no library dependency.
 *   Tooltip appears BELOW each button (into the document area) so it is
 *   never blocked by the sticky header above.
 * - Keyboard shortcuts shown inside the tooltip (passed via `item.title`).
 * - Dividers rendered as hairline separators between logical groups.
 * - Dropdowns use a styled `<select>` with a chevron overlay.
 * - Active state: accent-blue fill; disabled state: 35% opacity.
 */
export function Toolbar({ editor, items, className }: ToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Wire up JS tooltip via event delegation on the toolbar container.
  // This is more reliable than CSS ::before/::after pseudo-elements which
  // cannot escape a flex-sibling stacking context.
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;

    const onOver = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-tooltip]");
      if (!btn || btn.hasAttribute("disabled")) { hideTooltip(); return; }
      showTooltip(btn);
    };
    const onOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related?.closest("[data-tooltip]")) return;
      hideTooltip();
    };

    el.addEventListener("mouseover", onOver);
    el.addEventListener("mouseout", onOut);
    return () => {
      el.removeEventListener("mouseover", onOver);
      el.removeEventListener("mouseout", onOut);
      hideTooltip();
    };
  }, []);

  if (!editor) {
    return (
      <div
        className={`${styles.toolbar} ${className ?? ""}`.trim()}
        aria-busy="true"
        aria-label="Editor toolbar loading"
      />
    );
  }

  return (
    <div className={`${styles.toolbarOuter} ${className ?? ""}`.trim()}>
      <div
        ref={toolbarRef}
        className={styles.toolbar}
        role="toolbar"
        aria-label="Editor toolbar"
      >
      {items.map((item) => {
        if (item.kind === "divider") {
          return (
            <span
              key={item.id}
              className={styles.divider}
              role="separator"
              aria-orientation="vertical"
            />
          );
        }

        if (item.kind === "dropdown") {
          return (
            <div key={item.id} className={styles.dropdownWrapper}>
              <select
                className={styles.dropdown}
                aria-label={item.label}
                data-tooltip={item.label}
                onChange={(e) => {
                  const selected = item.items.find((i) => i.id === e.target.value);
                  if (selected) {
                    selected.onRun(editor);
                    // Reset to placeholder so the dropdown reflects doc state
                    (e.target as HTMLSelectElement).value = "";
                  }
                }}
                value=""
              >
                <option value="" disabled>
                  {item.label}
                </option>
                {item.items.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.label}
                  </option>
                ))}
              </select>
              <span className={styles.dropdownChevron} aria-hidden="true">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          );
        }

        // Button
        const active = item.isActive?.(editor) ?? false;
        const disabled = item.isDisabled?.(editor) ?? false;
        const tooltip = item.title ?? item.label;

        return (
          <button
            key={item.id}
            type="button"
            className={`${styles.button} ${active ? styles.active : ""}`}
            data-tooltip={tooltip}
            aria-label={tooltip}
            aria-pressed={item.isActive ? active : undefined}
            disabled={disabled}
            onClick={() => item.onRun(editor)}
          >
            {item.icon ?? <span className={styles.textLabel}>{item.label}</span>}
          </button>
        );
      })}
      </div>
    </div>
  );
}
