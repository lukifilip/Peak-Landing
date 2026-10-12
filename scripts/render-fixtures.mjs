// Renders every fixture (and the unavailable and error pages) to
// preview-out/*.html, which open directly in a browser. No Vercel needed.
// Run: node scripts/render-fixtures.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { FIXTURE_NAMES, readFixture } from '../portfolio/handler.js';
import { renderErrorPage, renderPortfolioPage, renderUnavailablePage } from '../portfolio/render.js';

const outDir = new URL('../preview-out/', import.meta.url);
mkdirSync(outDir, { recursive: true });
// Files sit one level down, and there is no image optimizer on disk.
const opts = { assetBase: '..', optimizeImages: false, noindex: true };

const write = (name, html) => {
  writeFileSync(new URL(`${name}.html`, outDir), html);
  console.log(`preview-out/${name}.html`);
};

for (const name of FIXTURE_NAMES) write(name, renderPortfolioPage(readFixture(name), opts));
write('unavailable', renderUnavailablePage(opts));
write('error', renderErrorPage('sarah', opts));
