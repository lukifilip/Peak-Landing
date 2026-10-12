// Inline SVG glyphs drawn to match the SF Symbols the app uses
// (checkmark.seal.fill, chevron.right, chevron.left, building.2.fill, doc.fill,
// rosette, link, xmark). SF Symbols are not licensed for the web, so these are
// our own drawings at the same weight and proportions. Colour comes from
// `currentColor` unless a glyph has a fixed one.

const svg = (body, { viewBox = '0 0 24 24', cls = '' } = {}) =>
  `<svg class="glyph${cls ? ` ${cls}` : ''}" viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;

/** A twelve-lobed seal outline, generated once. */
function sealOutline() {
  const points = [];
  const lobes = 12;
  for (let i = 0; i < lobes * 2; i++) {
    const angle = (Math.PI * i) / lobes - Math.PI / 2;
    const r = i % 2 === 0 ? 10.6 : 9.1;
    points.push(`${(12 + r * Math.cos(angle)).toFixed(2)} ${(12 + r * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${points.join('L')}Z`;
}
const SEAL = sealOutline();

export const ICON = {
  /** checkmark.seal.fill: the scalloped seal (stroked in its own colour so the
   *  lobes round off) with a white check. */
  seal: svg(
    `<path d="${SEAL}" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>` +
    '<path d="M8.1 12.3l2.7 2.7 5.2-5.6" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>',
    { cls: 'glyph-seal' }),

  chevronRight: svg(
    '<path d="M9.5 5.5L16 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    { cls: 'glyph-chevron' }),

  chevronLeft: svg(
    '<path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),

  xmark: svg(
    '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),

  /** building.2.fill: a tall and a short block with windows cut out. */
  building: svg(
    '<path fill="currentColor" fill-rule="evenodd" d="' +
    'M3.5 21V4.8c0-.6.4-1 1-1.1l7-1.6c.5-.1 1 .3 1 .8V21h-9z' +
    'M6 7h2v2H6zM9.5 7h1.5v2H9.5zM6 11h2v2H6zM9.5 11h1.5v2H9.5zM6 15h2v2H6zM9.5 15h1.5v2H9.5z' +
    'M13.5 21V9.5h6c.6 0 1 .4 1 1V21h-7z' +
    'M15.5 12h1.5v2h-1.5zM18 12h1v2h-1zM15.5 16h1.5v2h-1.5zM18 16h1v2h-1z"/>'),

  /** doc.fill: a page with a folded corner. */
  doc: svg(
    '<path fill="currentColor" d="M6.5 2h7.2c.4 0 .8.2 1.1.4l4.8 4.8c.3.3.4.7.4 1.1v11.2a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' +
    '<path fill="#fff" fill-opacity=".55" d="M14 2.6v4.4c0 .6.4 1 1 1h4.4z"/>'),

  /** rosette: a ring with two ribbon tails. */
  rosette: svg(
    '<circle cx="12" cy="9.2" r="6.2" fill="none" stroke="currentColor" stroke-width="2.1"/>' +
    '<circle cx="12" cy="9.2" r="2.6" fill="currentColor"/>' +
    '<path d="M8.6 14.2L7.2 21l4.8-2.4 4.8 2.4-1.4-6.8" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/>'),

  link: svg(
    '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4l-1.1 1.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.1-1.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),

  arrowUpRight: svg(
    '<path d="M8 16L16 8M9.5 8H16v6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
};
