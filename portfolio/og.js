// The 1200×630 share image for /u/<handle>, from the same JSON as the page.
// A white card on the app's grey: the person (photo or gradient initials),
// their name and headline, up to three certifications with their skill and
// level icons (or what they are learning), the verified-projects line when
// there is one, and the Peak mark with the link. Never a zero.
//
// Rendered with @vercel/og (Satori). Inter is used here because this is an
// image, not page text (the page itself uses the system font).

import { readFileSync } from 'node:fs';
import { ImageResponse } from '@vercel/og';
import { COPY } from './copy.js';
import { AVATAR_GRADIENTS, LEVEL_FILES, LEVEL_NAMES, initials, leadSkill, normalizePortfolio } from './render.js';

const ASSETS = new URL('../assets/', import.meta.url);
const read = (path) => readFileSync(new URL(path, ASSETS));
const dataUri = (path) => `data:image/png;base64,${read(path).toString('base64')}`;

const FONTS = [
  { name: 'Inter', data: read('portfolio/fonts/inter-latin-400-normal.woff'), weight: 400, style: 'normal' },
  { name: 'Inter', data: read('portfolio/fonts/inter-latin-600-normal.woff'), weight: 600, style: 'normal' },
  { name: 'Inter', data: read('portfolio/fonts/inter-latin-700-normal.woff'), weight: 700, style: 'normal' },
];

const C = {
  bg: '#F5F5F7', card: '#FFFFFF', pill: '#F5F5F7', text: '#000000', text2: '#6E6E73',
  green: '#34C759', greenText: '#1E7B34', blue: '#007AFF',
};

/** A Satori element. */
const h = (type, style, children = [], extra = {}) => ({
  type,
  props: {
    style: { display: 'flex', ...style },
    // A lone string is passed as-is: Satori counts a one-item array as a
    // list, which a block (for ellipsis and line clamping) may not hold.
    children: children.length === 1 && typeof children[0] === 'string' ? children[0] : children,
    ...extra,
  },
});
const image = (src, size, style = {}) =>
  ({ type: 'img', props: { src, width: size, height: size, style: { width: size, height: size, ...style } } });

const SEAL = 'data:image/svg+xml;base64,' + Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
  `<path fill="${C.green}" stroke="${C.green}" stroke-width="2" stroke-linejoin="round" d="${sealPath()}"/>` +
  '<path d="M8.1 12.3l2.7 2.7 5.2-5.6" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
).toString('base64');

function sealPath() {
  const pts = [];
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI * i) / 12 - Math.PI / 2;
    const r = i % 2 === 0 ? 10.6 : 9.1;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const clip = (s, max) => {
  const chars = Array.from(s);
  return chars.length > max ? `${chars.slice(0, max - 1).join('').trim()}…` : s;
};

function avatar(data, photo) {
  const size = 132;
  if (photo) {
    return image(photo, size, { borderRadius: size / 2, objectFit: 'cover' });
  }
  const [from, to] = AVATAR_GRADIENTS[data.avatar.gradient];
  return h('div', {
    width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
    backgroundImage: `linear-gradient(to right, ${from}, ${to})`, color: '#fff', fontSize: 50, fontWeight: 600,
  }, [initials(data.name)]);
}

function skillRow(skill, learning) {
  const icon = skill.icon
    ? image(dataUri(`skill_icons/${skill.icon}.png`), 36)
    : h('div', { width: 34, height: 34, borderRadius: 17, backgroundColor: skill.color || C.blue });
  return h('div', { alignItems: 'center', height: 56 }, [
    h('div', { width: 56, height: 56, borderRadius: 14, backgroundColor: C.pill, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, [icon]),
    h('div', { flexDirection: 'column', marginLeft: 18, flexGrow: 1, flexShrink: 1, minWidth: 0 }, [
      h('div', { fontSize: 25, fontWeight: 600, color: C.text, lineHeight: 1.15 }, [clip(skill.name, 40)]),
      h('div', { fontSize: 20, color: C.text2, marginTop: 2 }, [learning ? COPY.learning : skill.standing]),
    ]),
    !learning && skill.level != null
      ? image(dataUri(`levels/${LEVEL_FILES[skill.level]}.png`), 32)
      : h('div', {}, []),
  ]);
}

/**
 * Build the image. `photo` is the avatar already fetched as a data URI (or
 * null): the caller fetches it with a timeout so a slow photo host never
 * breaks the card.
 */
export function renderShareImage(raw, { photo = null } = {}) {
  const data = normalizePortfolio(raw);
  const certified = data.skills ? data.skills.items.filter((s) => s.level != null) : [];
  const learning = certified.length === 0 && data.skills ? data.skills.items : [];
  const lead = leadSkill(data);
  const rows = certified.length > 0
    ? [lead, ...certified.filter((s) => s !== lead)].slice(0, 3)
    : learning.slice(0, 3);

  const withWork = data.companies.filter((c) => c.verifiedCount > 0).map((c) => c.name);
  // "at LiveLit" only when one company did all the work and its name is short.
  const atCompany = withWork.length === 1 && Array.from(withWork[0]).length <= 22 ? withWork : [];
  const verifiedText = data.verifiedCount > 0 ? COPY.descVerifiedAt(data.verifiedCount, atCompany) : '';
  const headlineSize = Array.from(data.headline).length > 70 ? 26 : 30;

  const card = h('div', {
    flexDirection: 'column', width: 1104, height: 534, backgroundColor: C.card, borderRadius: 48,
    padding: '56px 64px 48px', justifyContent: 'space-between',
  }, [
    h('div', { flexDirection: 'column' }, [
      h('div', { alignItems: 'center' }, [
        avatar(data, photo),
        h('div', { flexDirection: 'column', marginLeft: 36, flexShrink: 1, width: 800 }, [
          // One line for the name, two for the headline, each ending in "…".
          h('div', { display: 'block', fontSize: 56, fontWeight: 700, color: C.text, lineHeight: 1.12,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, [data.name]),
          h('div', { display: 'block', fontSize: headlineSize, color: C.text2, marginTop: 10, lineHeight: 1.3,
            lineClamp: 2, overflow: 'hidden' }, [data.headline]),
        ]),
      ]),
      rows.length > 0
        ? h('div', { flexDirection: 'column', marginTop: 30, gap: 10 },
          rows.map((s) => skillRow(s, certified.length === 0)))
        : h('div', {}, []),
    ]),
    h('div', { alignItems: 'center', justifyContent: 'space-between' }, [
      h('div', { alignItems: 'center', flexShrink: 0, marginRight: 32 }, [
        image(dataUri('app_icon.png'), 44, { borderRadius: 11 }),
        h('div', { fontSize: 24, color: C.text2, marginLeft: 14 }, [`peakofficial.app/u/${data.handle}`]),
      ]),
      verifiedText
        ? h('div', { alignItems: 'center', flexShrink: 1, minWidth: 0 }, [
          image(SEAL, 30, { flexShrink: 0 }),
          h('div', { display: 'block', fontSize: 24, fontWeight: 600, color: C.greenText, marginLeft: 10,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, [verifiedText]),
        ])
        : h('div', {}, []),
    ]),
  ]);

  return new ImageResponse(
    h('div', { width: 1200, height: 630, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter' }, [card]),
    { width: 1200, height: 630, fonts: FONTS, emoji: 'twemoji' },
  );
}

/** The static card for the unavailable and error pages. */
export function renderFallbackImage() {
  return new ImageResponse(
    h('div', { width: 1200, height: 630, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter' }, [
      h('div', {
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        width: 1104, height: 534, backgroundColor: C.card, borderRadius: 48,
      }, [
        image(dataUri('app_icon.png'), 120, { borderRadius: 28 }),
        h('div', { fontSize: 64, fontWeight: 700, color: C.text, marginTop: 32 }, ['Peak']),
        h('div', { fontSize: 32, color: C.text2, marginTop: 12 }, [COPY.tagline]),
      ]),
    ]),
    { width: 1200, height: 630, fonts: FONTS },
  );
}

export { LEVEL_NAMES };
