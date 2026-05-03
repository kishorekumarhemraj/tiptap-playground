/**
 * Minimal inline SVG icon set for the editor toolbar.
 * All icons are 16×16, stroke-based, consistent weight (1.5px).
 * No external dependency — tree-shaken by import.
 */

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  "aria-hidden": true as const,
};

export function IconBold() {
  return (
    <svg {...base}>
      <path d="M4 3h5a3 3 0 0 1 0 6H4V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 9h5.5a3 3 0 0 1 0 6H4V9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function IconItalic() {
  return (
    <svg {...base}>
      <path d="M6.5 3h5M4.5 13h5M9.5 3 6.5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconUnderline() {
  return (
    <svg {...base}>
      <path d="M4 3v5a4 4 0 0 0 8 0V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconStrikethrough() {
  return (
    <svg {...base}>
      <path d="M12 5.5C12 4.12 10.21 3 8 3S4 4.12 4 5.5c0 1.08.82 1.96 2 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 8c1 .57 2 1.42 2 2.5C12 11.88 10.21 13 8 13S4 11.88 4 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconCode() {
  return (
    <svg {...base}>
      <path d="M5.5 4 2 8l3.5 4M10.5 4 14 8l-3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCodeBlock() {
  return (
    <svg {...base}>
      <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 6 3.5 8l2 2M10.5 6l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconH1() {
  return (
    <svg {...base} viewBox="0 0 16 16">
      <path d="M2 3v10M2 8h6M8 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 6l1.5-1v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconH2() {
  return (
    <svg {...base}>
      <path d="M2 3v10M2 8h5.5M7.5 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 7c0-1 .75-1.75 2-1.75S15 6 15 7c0 .75-.5 1.5-2 2.5L11 13h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconH3() {
  return (
    <svg {...base}>
      <path d="M2 3v10M2 8h5.5M7.5 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 7c0-1 .7-1.75 2-1.75S15 6 15 7c0 .8-.6 1.4-1.5 1.5C14.4 8.6 15 9.2 15 10s-.9 2-2.5 2c-1.2 0-2-.8-2-1.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconBulletList() {
  return (
    <svg {...base}>
      <circle cx="3.5" cy="5" r="1" fill="currentColor" />
      <circle cx="3.5" cy="8" r="1" fill="currentColor" />
      <circle cx="3.5" cy="11" r="1" fill="currentColor" />
      <path d="M6.5 5h7M6.5 8h7M6.5 11h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconOrderedList() {
  return (
    <svg {...base}>
      <path d="M2 3.5h1.5v3M2 6.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 9c0-.8.6-1.3 1.5-1.3S5 8.5 5 9.3c0 .5-.3.9-1 1.4L2 12h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 4.5h7M7 8h7M7 11.5h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconTaskList() {
  return (
    <svg {...base}>
      <rect x="2" y="3.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.2 5.5 4.5 7 6.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="9.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 5.5h6M8 11.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconBlockquote() {
  return (
    <svg {...base}>
      <path d="M3 5c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v2c0 1.1-.9 2-2 2H4a1 1 0 0 1-1-1V5Z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 5c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v2c0 1.1-.9 2-2 2h-1a1 1 0 0 1-1-1V5Z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 10h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconHorizontalRule() {
  return (
    <svg {...base}>
      <path d="M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 2" />
    </svg>
  );
}

export function IconSection() {
  return (
    <svg {...base}>
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 5h6M5 8h6M5 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconEditableField() {
  return (
    <svg {...base}>
      <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 1.5" />
      <path d="M8 7v3M6.5 8.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconInstruction() {
  return (
    <svg {...base}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5" r=".8" fill="currentColor" />
    </svg>
  );
}

export function IconTrackChanges() {
  return (
    <svg {...base}>
      <path d="M4 8h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9 5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 4l1.5 1.5L5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12l1.5-1.5L5 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAcceptAll() {
  return (
    <svg {...base}>
      <path d="M3 8.5 6 12l7-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRejectAll() {
  return (
    <svg {...base}>
      <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconSaveVersion() {
  return (
    <svg {...base}>
      <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="5.5" y="2" width="5" height="3.5" rx=".5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 9h6M5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconExportWord() {
  return (
    <svg {...base}>
      <rect x="2" y="2" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 6h4M5 9h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 9v5M9 12l2 2 2-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPageBreak() {
  return (
    <svg {...base}>
      <path d="M2 5h12M2 11h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 5v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

export function IconUndo() {
  return (
    <svg {...base}>
      <path d="M3 7.5A5 5 0 1 1 4.9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 3.5v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRedo() {
  return (
    <svg {...base}>
      <path d="M13 7.5A5 5 0 1 0 11.1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 3.5v4H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
