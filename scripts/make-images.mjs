// Draws the static images the portfolio needs, so none are hand-made:
//   assets/portfolio/og-fallback.png       share card for the unavailable and error pages
//   assets/portfolio/fixtures/*.png        abstract stand-ins for the fixtures' photo,
//                                          logos, banner and project image
// Run: node scripts/make-images.mjs

import { writeFileSync } from 'node:fs';
import { ImageResponse } from '@vercel/og';
import { renderFallbackImage } from '../portfolio/og.js';

const out = (path) => new URL(`../assets/portfolio/${path}`, import.meta.url);
const h = (style, children = []) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

async function save(path, response) {
  writeFileSync(out(path), Buffer.from(await response.arrayBuffer()));
  console.log(`wrote assets/portfolio/${path}`);
}

const blob = (left, top, size, color, opacity = 1) =>
  h({ position: 'absolute', left, top, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity });

await save('og-fallback.png', renderFallbackImage());

// A soft, photo-like abstract portrait for the "full" fixture.
await save('fixtures/avatar.png', new ImageResponse(
  h({ width: 320, height: 320, position: 'relative', backgroundImage: 'linear-gradient(160deg, #F6D7C3, #C99A84)' }, [
    blob(70, 150, 190, '#5B3B31'),
    blob(100, 52, 120, '#E7B9A0'),
    blob(88, 30, 146, '#3A2723', 0.9),
    blob(102, 62, 118, '#EBC1A8'),
  ]), { width: 320, height: 320 }));

await save('fixtures/livelit-logo.png', new ImageResponse(
  h({ width: 192, height: 192, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B3D' }, [
    h({ width: 70, height: 100, borderRadius: '50% 50% 45% 45%', backgroundColor: '#FFE3C2' }),
  ]), { width: 192, height: 192 }));

await save('fixtures/northwind-logo.png', new ImageResponse(
  h({ width: 192, height: 192, alignItems: 'center', justifyContent: 'center', backgroundColor: '#14324F',
    color: '#FFFFFF', fontSize: 110, fontWeight: 700 }, ['N']), { width: 192, height: 192 }));

await save('fixtures/livelit-banner.png', new ImageResponse(
  h({ width: 1200, height: 400, position: 'relative', backgroundImage: 'linear-gradient(120deg, #FFB48A, #FF6B3D 55%, #C2410C)' }, [
    blob(-80, 180, 420, '#FFE3C2', 0.35),
    blob(760, -160, 520, '#FFFFFF', 0.18),
    blob(420, 260, 260, '#7C2D12', 0.25),
  ]), { width: 1200, height: 400 }));

await save('fixtures/seo-project.png', new ImageResponse(
  h({ width: 1200, height: 400, backgroundColor: '#EAF2FF', padding: 60, gap: 28, alignItems: 'flex-end' },
    [140, 210, 180, 260, 240, 300, 280].map((height, i) =>
      h({ width: 120, height, borderRadius: 18, backgroundColor: i === 6 ? '#007AFF' : '#9CC3FF' }))),
  { width: 1200, height: 400 }));
