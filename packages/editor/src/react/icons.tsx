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
    <svg width="16" height="16" viewBox="0 0 35 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="uuid-word-1" cx="-619.29" cy="488.84" fx="-619.29" fy="488.84" r="1" gradientTransform="translate(29495.74 9885.89) scale(47.57 -20.15)" gradientUnits="userSpaceOnUse">
          <stop offset=".18" stopColor="#1657f4"/><stop offset=".57" stopColor="#0036c4"/>
        </radialGradient>
        <linearGradient id="uuid-word-2" x1="5" y1="97" x2="27.97" y2="97" gradientTransform="translate(0 116) scale(1 -1)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#66c0ff"/><stop offset=".26" stopColor="#0094f0"/>
        </linearGradient>
        <radialGradient id="uuid-word-3" cx="-637.72" cy="517.98" fx="-637.72" fy="517.98" r="1" gradientTransform="translate(-40017.96 -12225.34) rotate(133.55) scale(29.36 -72.32)" gradientUnits="userSpaceOnUse">
          <stop offset=".14" stopColor="#d471ff"/><stop offset=".83" stopColor="#509df5" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="uuid-word-4" cx="-611.76" cy="514.18" fx="-611.76" fy="514.18" r="1" gradientTransform="translate(-52234.57 11411.47) rotate(90) scale(18.62 -101.65)" gradientUnits="userSpaceOnUse">
          <stop offset=".28" stopColor="#4f006f" stopOpacity="0"/><stop offset="1" stopColor="#4f006f"/>
        </radialGradient>
        <linearGradient id="uuid-word-5" x1="5" y1="107.22" x2="35" y2="106.72" gradientTransform="translate(0 116) scale(1 -1)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9deaff"/><stop offset=".2" stopColor="#3bd5ff"/>
        </linearGradient>
        <radialGradient id="uuid-word-6" cx="-650.27" cy="515.34" fx="-650.27" fy="515.34" r="1" gradientTransform="translate(-26921.47 -31089.42) rotate(166.85) scale(29.49 -70.64)" gradientUnits="userSpaceOnUse">
          <stop offset=".06" stopColor="#e4a7fe"/><stop offset=".54" stopColor="#e4a7fe" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="uuid-word-7" cx="-600.8" cy="515.58" fx="-600.8" fy="515.58" r="1" gradientTransform="translate(1363.5 17878.99) rotate(45) scale(22.63 -22.63)" gradientUnits="userSpaceOnUse">
          <stop offset=".08" stopColor="#367af2"/><stop offset=".87" stopColor="#001a8f"/>
        </radialGradient>
        <radialGradient id="uuid-word-8" cx="-598.04" cy="557.24" fx="-598.04" fy="557.24" r="1" gradientTransform="translate(-7105.12 6724.6) rotate(90) scale(11.2 -12.77)" gradientUnits="userSpaceOnUse">
          <stop offset=".59" stopColor="#2763e5" stopOpacity="0"/><stop offset=".97" stopColor="#58aafe"/>
        </radialGradient>
      </defs>
      <path d="M5,27.09l14-17.09,16,11.11v11.39c0,1.93-1.57,3.5-3.5,3.5H11c-3.31,0-6-2.69-6-6v-2.91Z" fill="url(#uuid-word-1)"/>
      <path d="M5,15.04c0-2.49,2.01-4.5,4.5-4.5h20.39l5.11-2.54v12.5c0,1.93-1.57,3.5-3.5,3.5H11c-3.31,0-6,2.69-6,6v-14.96Z" fill="url(#uuid-word-2)"/>
      <path d="M5,15.04c0-2.49,2.01-4.5,4.5-4.5h20.39l5.11-2.54v12.5c0,1.93-1.57,3.5-3.5,3.5H11c-3.31,0-6,2.69-6,6v-14.96Z" fill="url(#uuid-word-3)" fillOpacity=".6"/>
      <path d="M5,15.04c0-2.49,2.01-4.5,4.5-4.5h20.39l5.11-2.54v12.5c0,1.93-1.57,3.5-3.5,3.5H11c-3.31,0-6,2.69-6,6v-14.96Z" fill="url(#uuid-word-4)" fillOpacity=".1"/>
      <path d="M5,6C5,2.69,7.69,0,11,0h20.5c1.93,0,3.5,1.57,3.5,3.5v5c0,1.93-1.57,3.5-3.5,3.5H11c-3.31,0-6,2.69-6,6V6Z" fill="url(#uuid-word-5)"/>
      <path d="M5,6C5,2.69,7.69,0,11,0h20.5c1.93,0,3.5,1.57,3.5,3.5v5c0,1.93-1.57,3.5-3.5,3.5H11c-3.31,0-6,2.69-6,6V6Z" fill="url(#uuid-word-6)" fillOpacity=".8"/>
      <rect y="17" width="16" height="16" rx="3.25" ry="3.25" fill="url(#uuid-word-7)"/>
      <rect y="17" width="16" height="16" rx="3.25" ry="3.25" fill="url(#uuid-word-8)" fillOpacity=".65"/>
      <path d="M13.49,20.43l-1.97,9.14h-2.35s-1.16-5.48-1.16-5.48l-1.22,5.49h-2.38l-1.89-9.14h1.94l1.17,6.03,1.16-6.03h2.38l1.21,6.03,1.14-6.03h1.97Z" fill="#fff"/>
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

export function IconComment() {
  return (
    <svg {...base}>
      <path d="M14 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2v3l3-3h7a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMultiColumn() {
  return (
    <svg {...base}>
      <rect x="1" y="3" width="5" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="3" width="5" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconPDF() {
  return (
    <svg width="16" height="16" viewBox="0 0 75.320129 92.604164" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g transform="translate(53.548057 -183.975276) scale(1.4843)">
        <path fill="#ff2116" d="M-29.632812 123.94727c-3.551967 0-6.44336 2.89347-6.44336 6.44531v49.49804c0 3.55185 2.891393 6.44532 6.44336 6.44532H8.2167969c3.5519661 0 6.4433591-2.89335 6.4433591-6.44532v-40.70117s.101353-1.19181-.416015-2.35156c-.484969-1.08711-1.275391-1.84375-1.275391-1.84375a1.0584391 1.0584391 0 0 0-.0059-.008l-9.3906254-9.21094a1.0584391 1.0584391 0 0 0-.015625-.0156s-.8017392-.76344-1.9902344-1.27344c-1.39939552-.6005-2.8417968-.53711-2.8417968-.53711l.021484-.002z" />
        <path fill="#f5f5f5" d="M-29.632812 126.06445h28.3789058a1.0584391 1.0584391 0 0 0 .021484 0s1.13480448.011 1.96484378.36719c.79889772.34282 1.36536982.86176 1.36914062.86524.0000125.00001.00391.004.00391.004l9.3671868 9.18945s.564354.59582.837891 1.20899c.220779.49491.234375 1.40039.234375 1.40039a1.0584391 1.0584391 0 0 0-.002.0449v40.74609c0 2.41592-1.910258 4.32813-4.3261717 4.32813H-29.632812c-2.415914 0-4.326172-1.91209-4.326172-4.32813v-49.49804c0-2.41603 1.910258-4.32813 4.326172-4.32813z" />
        <path fill="#ff2116" d="M-23.40766 161.09299c-1.45669-1.45669.11934-3.45839 4.39648-5.58397l2.69124-1.33743 1.04845-2.29399c.57665-1.26169 1.43729-3.32036 1.91254-4.5748l.8641-2.28082-.59546-1.68793c-.73217-2.07547-.99326-5.19438-.52872-6.31588.62923-1.51909 2.69029-1.36323 3.50626.26515.63727 1.27176.57212 3.57488-.18329 6.47946l-.6193 2.38125.5455.92604c.30003.50932 1.1764 1.71867 1.9475 2.68743l1.44924 1.80272 1.8033728-.23533c5.72900399-.74758 7.6912472.523 7.6912472 2.34476 0 2.29921-4.4984914 2.48899-8.2760865-.16423-.8499666-.59698-1.4336605-1.19001-1.4336605-1.19001s-2.3665326.48178-3.531704.79583c-1.202707.32417-1.80274.52719-3.564509 1.12186 0 0-.61814.89767-1.02094 1.55026-1.49858 2.4279-3.24833 4.43998-4.49793 5.1723-1.3991.81993-2.86584.87582-3.60433.13733zm2.28605-.81668c.81883-.50607 2.47616-2.46625 3.62341-4.28553l.46449-.73658-2.11497 1.06339c-3.26655 1.64239-4.76093 3.19033-3.98386 4.12664.43653.52598.95874.48237 2.01093-.16792zm21.21809-5.95578c.80089-.56097.68463-1.69142-.22082-2.1472-.70466-.35471-1.2726074-.42759-3.1031574-.40057-1.1249.0767-2.9337647.3034-3.2403347.37237 0 0 .993716.68678 1.434896.93922.58731.33544 2.0145161.95811 3.0565161 1.27706 1.02785.31461 1.6224.28144 2.0729-.0409zm-8.53152-3.54594c-.4847-.50952-1.30889-1.57296-1.83152-2.3632-.68353-.89643-1.02629-1.52887-1.02629-1.52887s-.4996 1.60694-.90948 2.57394l-1.27876 3.16076-.37075.71695s1.971043-.64627 2.97389-.90822c1.0621668-.27744 3.21787-.70134 3.21787-.70134zm-2.74938-11.02573c.12363-1.0375.1761-2.07346-.15724-2.59587-.9246-1.01077-2.04057-.16787-1.85154 2.23517.0636.8084.26443 2.19033.53292 3.04209l.48817 1.54863.34358-1.16638c.18897-.64151.47882-2.02015.64411-3.06364z" />
        <path fill="#2c2c2c" d="M-20.930423 167.83862h2.364986q1.133514 0 1.840213.2169.706698.20991 1.189489.9446.482795.72769.482795 1.75625 0 .94459-.391832 1.6233-.391833.67871-1.056548.97958-.65772.30087-2.02913.30087h-.818651v3.72941h-1.581322zm1.581322 1.22447v3.33058h.783664q1.049552 0 1.44838-.39184.405826-.39183.405826-1.27345 0-.65772-.265887-1.06355-.265884-.41282-.587747-.50378-.314866-.098-1.000572-.098zm5.50664-1.22447h2.148082q1.560333 0 2.4909318.55276.9375993.55276 1.4133973 1.6443.482791 1.09153.482791 2.42096 0 1.3994-.4338151 2.49793-.4268149 1.09153-1.3154348 1.76324-.8816233.67172-2.5189212.67172h-2.267031zm1.581326 1.26645v7.018h.657715q1.378411 0 2.001144-.9516.6227329-.95858.6227329-2.5539 0-3.5125-2.6238769-3.5125zm6.4722254-1.26645h5.30372941v1.26645H-4.2075842v2.85478h2.9807225v1.26646h-2.9807225v4.16322h-1.5813254z" />
      </g>
    </svg>
  );
}

export function IconZoomOut() {
  return (
    <svg {...base}>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 7h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconZoomIn() {
  return (
    <svg {...base}>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 7h4M7 5v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
