// Stack It: line-engraving illustrations.
// One style everywhere: thin ink strokes (.l), paper fill with an ink outline (.s),
// diagonal hatching for shadow (.h, pattern #hatch), and one accent color (.a).
// Colors come from CSS variables so the same drawing works on a day or night sky.
//
// Each landmark drawing has an anchor:
//   'top'    – the drawing hangs below the landmark's line (its summit is the line)
//   'center' – the drawing is centered on the line (things that fly or orbit)
//   'line'   – a band across the whole sky

const svg = (w, h, body, label = '') =>
  `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} focusable="false">${body}</svg>`;

export const LANDMARK_ART = {
  person: {
    anchor: 'top',
    markup: svg(44, 112, `
      <circle class="s" cx="22" cy="10" r="8"/>
      <path class="s" d="M9 26 Q22 19 35 26 L37 62 L31 62 L30 108 L23 108 L22 68 L21 108 L14 108 L13 62 L7 62 Z"/>
      <path class="h" d="M22 22 Q30 22 35 26 L37 62 L31 62 L30 108 L23 108 L22 68 Z"/>
      <path class="l" d="M13 62 L14 38 M31 62 L30 38"/>`),
  },
  bus: {
    anchor: 'top',
    markup: svg(176, 68, `
      <rect class="a" x="3" y="3" width="170" height="48" rx="7"/>
      <path class="h" d="M3 38 H173 V44 a7 7 0 0 1 -7 7 H10 a7 7 0 0 1 -7 -7 Z"/>
      <g class="s">
        <rect x="14" y="11" width="20" height="15" rx="1.5"/><rect x="40" y="11" width="20" height="15" rx="1.5"/>
        <rect x="66" y="11" width="20" height="15" rx="1.5"/><rect x="92" y="11" width="20" height="15" rx="1.5"/>
        <rect x="118" y="11" width="20" height="15" rx="1.5"/><rect x="147" y="11" width="16" height="36" rx="1.5"/>
      </g>
      <path class="l" d="M3 32 H143 M3 36 H143"/>
      <circle class="s" cx="38" cy="54" r="11"/><circle class="s" cx="138" cy="54" r="11"/>
      <circle class="l" cx="38" cy="54" r="4"/><circle class="l" cx="138" cy="54" r="4"/>`),
  },
  house: {
    anchor: 'top',
    markup: svg(132, 124, `
      <rect class="s" x="96" y="10" width="12" height="30"/>
      <rect class="s" x="16" y="52" width="100" height="70"/>
      <path class="h" d="M80 52 H116 V122 H80 Z"/>
      <path class="a" d="M4 54 L66 6 L128 54 Z"/>
      <path class="l" d="M66 6 L66 54 M20 46 L112 46" opacity="0.5"/>
      <g class="s">
        <rect x="28" y="62" width="18" height="18"/><rect x="86" y="62" width="18" height="18"/>
        <rect x="28" y="92" width="18" height="18"/><rect x="58" y="88" width="16" height="34"/>
      </g>
      <path class="l" d="M37 62 V80 M28 71 H46 M95 62 V80 M86 71 H104 M37 92 V110 M28 101 H46"/>`),
  },
  arch: {
    anchor: 'top',
    markup: svg(204, 204, `
      <path class="s" d="M12 204 C42 -59 162 -59 192 204 L168 204 C146 -28 58 -28 36 204 Z"/>
      <path class="h" d="M102 26 C140 30 162 110 168 204 L192 204 C176 90 150 22 102 4 Z"/>
      <path class="l" d="M24 204 C50 -44 154 -44 180 204" opacity="0.45"/>`),
  },
  burj: {
    anchor: 'top',
    markup: svg(92, 284, `
      <path class="s" d="M46 0 L48 50 L51 50 L52 90 L56 90 L57 130 L62 130 L63 170 L69 170 L70 210 L77 210 L79 250 L87 250 L89 284 L3 284 L5 250 L13 250 L15 210 L22 210 L23 170 L29 170 L30 130 L35 130 L36 90 L40 90 L41 50 L44 50 Z"/>
      <path class="h" d="M46 50 L51 50 L52 90 L56 90 L57 130 L62 130 L63 170 L69 170 L70 210 L77 210 L79 250 L87 250 L89 284 L46 284 Z"/>
      <path class="l" d="M46 50 V284 M36 130 H57 M30 170 H63 M23 210 H70 M15 250 H79"/>
      <circle class="a" cx="46" cy="3" r="2.5"/>`),
  },
  everest: {
    anchor: 'top',
    markup: svg(304, 176, `
      <path class="s" d="M0 176 L68 92 L96 108 L152 4 L188 62 L208 52 L304 176 Z"/>
      <path class="h" d="M152 4 L188 62 L208 52 L304 176 L176 176 L164 96 Z"/>
      <path class="snow" d="M152 4 L128 46 L141 40 L149 54 L160 38 L171 48 L188 62 Z"/>
      <path class="l" d="M152 4 L164 96 L176 176 M96 108 L118 176 M208 52 L236 120"/>`),
  },
  airliner: {
    anchor: 'center',
    markup: svg(176, 54, `
      <path class="s" d="M16 21 L5 2 H18 L38 21 Z"/>
      <path class="s" d="M6 30 Q6 21 22 21 H144 Q170 23 173 30 Q170 36 144 37 H22 Q6 37 6 30 Z"/>
      <path class="h" d="M10 33 H170 Q160 37 144 37 H22 Q12 37 10 33 Z"/>
      <path class="a" d="M72 32 L104 50 H118 L100 32 Z"/>
      <ellipse class="s" cx="104" cy="41" rx="11" ry="4"/>
      <path class="l" d="M44 26 H140" stroke-dasharray="2 4"/>`),
  },
  karman: { anchor: 'line', markup: '' },
  iss: {
    anchor: 'center',
    markup: svg(208, 96, `
      <g class="a">
        <rect x="14" y="6" width="26" height="34"/><rect x="44" y="6" width="26" height="34"/>
        <rect x="138" y="6" width="26" height="34"/><rect x="168" y="6" width="26" height="34"/>
        <rect x="14" y="56" width="26" height="34"/><rect x="44" y="56" width="26" height="34"/>
        <rect x="138" y="56" width="26" height="34"/><rect x="168" y="56" width="26" height="34"/>
      </g>
      <g class="grid">
        <rect x="14" y="6" width="26" height="34"/><rect x="44" y="6" width="26" height="34"/>
        <rect x="138" y="6" width="26" height="34"/><rect x="168" y="6" width="26" height="34"/>
        <rect x="14" y="56" width="26" height="34"/><rect x="44" y="56" width="26" height="34"/>
        <rect x="138" y="56" width="26" height="34"/><rect x="168" y="56" width="26" height="34"/>
      </g>
      <rect class="s" x="8" y="44" width="192" height="8"/>
      <path class="l" d="M8 48 H200 M27 40 V56 M57 40 V56 M151 40 V56 M181 40 V56"/>
      <rect class="s" x="86" y="30" width="36" height="36" rx="4"/>
      <path class="h" d="M104 30 H118 a4 4 0 0 1 4 4 V62 a4 4 0 0 1 -4 4 H104 Z"/>
      <rect class="s" x="96" y="18" width="16" height="12"/><rect class="s" x="96" y="66" width="16" height="12"/>`),
  },
  gps: {
    anchor: 'center',
    markup: svg(124, 64, `
      <rect class="a" x="4" y="22" width="40" height="18"/><rect class="a" x="80" y="22" width="40" height="18"/>
      <g class="grid"><rect x="4" y="22" width="40" height="18"/><rect x="80" y="22" width="40" height="18"/></g>
      <path class="l" d="M44 31 H50 M74 31 H80 M62 44 V56 M55 56 H69"/>
      <rect class="s" x="50" y="18" width="24" height="26" rx="2"/>
      <path class="h" d="M62 18 H72 a2 2 0 0 1 2 2 V42 a2 2 0 0 1 -2 2 H62 Z"/>`),
  },
  geo: {
    anchor: 'center',
    markup: svg(136, 84, `
      <rect class="a" x="2" y="34" width="46" height="16"/><rect class="a" x="88" y="34" width="46" height="16"/>
      <g class="grid"><rect x="2" y="34" width="46" height="16"/><rect x="88" y="34" width="46" height="16"/></g>
      <path class="l" d="M48 42 H54 M82 42 H88 M68 22 V28"/>
      <rect class="s" x="54" y="28" width="28" height="32" rx="2"/>
      <path class="h" d="M68 28 H80 a2 2 0 0 1 2 2 V58 a2 2 0 0 1 -2 2 H68 Z"/>
      <path class="s" d="M50 18 Q68 4 86 18 Q68 26 50 18 Z"/>
      <path class="l" d="M68 18 L68 8"/>`),
  },
  moon: {
    anchor: 'center',
    markup: svg(264, 264, `
      <circle class="moon" cx="132" cy="132" r="124"/>
      <path class="hd" d="M132 8 A124 124 0 0 1 132 256 A72 124 0 0 0 132 8 Z"/>
      <g class="crater">
        <circle cx="92" cy="84" r="15"/><circle cx="152" cy="152" r="22"/><circle cx="108" cy="194" r="10"/>
        <circle cx="186" cy="90" r="9"/><circle cx="70" cy="152" r="8"/><circle cx="128" cy="118" r="5"/>
      </g>`, 'The Moon'),
  },
};

// Clouds: three shapes, reused at different sizes.
const CLOUD_SHAPES = [
  `<path class="cloud" d="M10 44 Q10 28 26 28 Q30 10 50 14 Q60 0 80 10 Q98 4 104 24 Q120 24 120 38 Q120 50 106 50 H22 Q10 50 10 44 Z"/>
   <path class="h" d="M14 44 H116 Q114 50 106 50 H22 Q12 50 14 44 Z"/>`,
  `<path class="cloud" d="M6 40 Q8 30 20 30 Q24 18 40 20 Q52 8 68 18 Q84 14 88 28 Q102 28 100 40 Q98 46 90 46 H14 Q4 46 6 40 Z"/>
   <path class="h" d="M8 41 H98 Q96 46 90 46 H14 Q6 46 8 41 Z"/>`,
  `<path class="cloud" d="M4 24 Q40 14 80 18 Q120 10 156 16 Q176 20 160 26 Q120 30 80 28 Q40 32 8 30 Q-2 28 4 24 Z"/>`,
];
export const cloudMarkup = (shape) => svg(shape === 2 ? 170 : 124, shape === 2 ? 34 : 54, CLOUD_SHAPES[shape]);

// A generic distant skyline (not any particular city), drawn as one hazy silhouette.
export const SKYLINE = svg(1200, 120, `
  <path class="skyline" d="M0 120 V92 H30 V78 H52 V96 H74 V60 H90 V50 H104 V64 H118 V88 H140 V70 H164 V100 H186 V74 H196 V40 H200 V30 H204 V40 H210 V76 H232 V96 H260 V66 H286 V84 H300 V56 H330 V92 H352 V80 H376 V100 H398 V62 H410 V46 H428 V64 H444 V90 H470 V72 H498 V96 H520 V84 H546 V58 H560 V38 H566 V58 H580 V90 H604 V70 H630 V98 H652 V76 H676 V88 H700 V52 H724 V80 H748 V94 H772 V68 H790 V48 H806 V68 H824 V96 H850 V74 H874 V90 H896 V60 H924 V86 H950 V100 H972 V72 H990 V44 H996 V32 H1002 V44 H1010 V80 H1036 V94 H1060 V66 H1084 V88 H1110 V78 H1136 V96 H1160 V70 H1184 V90 H1200 V120 Z"/>`);

// A stylized $100 note for the intro. Deliberately not a copy of real currency:
// no portrait, no seals, and "Stack It" lettering.
export const BILL = svg(260, 112, `
  <rect class="bill" x="2" y="2" width="256" height="108" rx="6"/>
  <rect class="l" x="10" y="10" width="240" height="92" rx="3"/>
  <rect class="l" x="14" y="14" width="232" height="84" rx="2" opacity="0.5"/>
  <g class="l" opacity="0.8" transform="translate(130 56)">
    ${Array.from({ length: 12 }, (_, i) => `<ellipse rx="34" ry="12" transform="rotate(${i * 15})"/>`).join('')}
    <circle r="9"/>
  </g>
  <text class="bill__num" x="20" y="38">100</text>
  <text class="bill__num" x="240" y="92" text-anchor="end">100</text>
  <text class="bill__word" x="130" y="100" text-anchor="middle">STACK IT · ONE HUNDRED</text>`);
