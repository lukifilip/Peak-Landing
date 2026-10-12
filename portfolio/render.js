// The public portfolio page: JSON (contract v1, from the `publicPortfolio`
// Cloud Function's `?format=json`) → one HTML string. Pure: no reads, no
// network, no clock. Every value from the JSON is escaped where it is written.
//
// The source of truth for structure, wording, colours and spacing is the iOS
// app's PortfolioView as ANOTHER user sees it (Peak/Views/Portfolio/
// PortfolioView.swift, PortfolioCards.swift). The plan is
// PORTFOLIO_REDESIGN_PLAN.md in this project. The rule for every section:
// show it only when it has something true to say; never a zero, a dash,
// "None yet", or anything addressed to the owner.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { COPY, listNames } from './copy.js';
import { ICON } from './icons.js';

const STYLES = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const SCRIPT = readFileSync(new URL('./page.js', import.meta.url), 'utf8');
// Runs in <head> so collapsed rows never flash open before the page script.
const HEAD_SCRIPT = "document.documentElement.classList.add('js')";

const cspHash = (code) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`;

/** The Content-Security-Policy for every page this renderer writes. Scripts
 *  only by hash, so injected markup could never run. */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  `script-src ${cspHash(HEAD_SCRIPT)} ${cspHash(SCRIPT)}`,
  "style-src 'unsafe-inline'",
  'img-src https: data: blob: \'self\'',
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

export const SITE = {
  host: 'www.peakofficial.app',
  origin: 'https://www.peakofficial.app',
  appStoreId: '6758958604',
  reportEmail: 'peakofficial.app@gmail.com',
};

const LEVEL_FILES = ['novice', 'beginner', 'intermediate', 'advanced', 'expert'];
const LEVEL_NAMES = ['Novice', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The skill icons this site serves from assets/skill_icons/. A skill whose
 *  icon is not here draws a disc in its own colour. */
export const SKILL_ICON_FILES = new Set([
  'ai_productivity', 'business_analytics', 'cloud_computing', 'content_marketing',
  'copywriting', 'cyber_security', 'data_analysis', 'digital_marketing',
  'email_marketing', 'excel_spreadsheets', 'graphic_design', 'javascript',
  'machine_learning', 'negotiation', 'personal_branding', 'personal_finance',
  'project_management', 'prompt_engineering', 'public_speaking', 'python', 'react',
  'seo', 'ux_ui_design',
]);

/** Hosts whose images go through Vercel's optimizer (allow-listed in vercel.json). */
const OPTIMIZED_HOSTS = new Set(['firebasestorage.googleapis.com']);
/** Must match `images.sizes` in vercel.json. */
export const IMAGE_SIZES = [64, 96, 128, 160, 256, 384, 640, 750, 828, 1080, 1200, 1920];

/** The four avatar gradients (AsyncProfileImage.swift, `InitialsAvatar`). */
export const AVATAR_GRADIENTS = [
  ['#6A5CFF', '#FF4D9D'],
  ['#00A6FF', '#7B61FF'],
  ['#FF7A59', '#FFC857'],
  ['#00B894', '#0984E3'],
];

// ── Small helpers ───────────────────────────────────────────────────────────

/** Escape for HTML text and attribute values. */
export function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const text = (v, max = 4000) => {
  if (typeof v !== 'string') return '';
  const chars = Array.from(v.trim());
  return chars.length > max ? chars.slice(0, max).join('').trim() : chars.join('');
};
const list = (v) => (Array.isArray(v) ? v : []);
const isKey = (v) => typeof v === 'string' && /^[0-9a-f]{6,32}$/.test(v);
const hexColor = (v) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
const skillIcon = (v) => (typeof v === 'string' && SKILL_ICON_FILES.has(v) ? v : null);

/** http(s) URLs from the backend, or this site's own /assets/ (fixtures only). */
export function safeUrl(v) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (/^https?:\/\/[^\s"'<>]+$/i.test(s)) return s;
  if (/^\/assets\/[A-Za-z0-9_\-/.]+$/.test(s) && !s.includes('..')) return s;
  return '';
}

/** Valid handle, the same rule the backend applies. */
export function isValidHandle(handle) {
  return typeof handle === 'string' && /^[a-z0-9._-]{1,40}$/.test(handle);
}

/** "2026-03" → "Mar 2026", as the app's `completedMonthLabel` writes it. */
export function monthLabel(month) {
  const m = /^(\d{4})-(\d{2})$/.exec(month || '');
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return '';
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Initials as the app draws them: first + last word, or the first two
 *  characters of one word; letters and digits only. */
export function initials(name) {
  const words = String(name || '')
    .split(/\s+/)
    .map((w) => Array.from(w).filter((c) => /[\p{L}\p{N}]/u.test(c)).join(''))
    .filter(Boolean);
  if (words.length === 0) return 'U';
  if (words.length > 1) {
    return (Array.from(words[0])[0] + Array.from(words[words.length - 1])[0]).toUpperCase();
  }
  return Array.from(words[0]).slice(0, 2).join('').toUpperCase();
}

// ── The payload, checked ────────────────────────────────────────────────────

/**
 * Accept only the v1 contract, field by field, so the renderer never trusts
 * the shape of what it is given. Unknown fields are dropped; a wrong version
 * throws (the caller shows the error page).
 */
export function normalizePortfolio(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== 1) {
    throw new Error('Unsupported portfolio payload');
  }
  const handle = typeof raw.handle === 'string' ? raw.handle.toLowerCase() : '';
  if (!isValidHandle(handle)) throw new Error('Invalid handle in payload');

  const skillItem = (s) => {
    if (!s || typeof s !== 'object') return null;
    const name = text(s.name, 80);
    if (!name) return null;
    const level = Number.isInteger(s.level) && s.level >= 0 && s.level <= 4 ? s.level : null;
    return {
      id: text(String(s.id ?? ''), 40),
      name,
      icon: skillIcon(s.icon),
      color: hexColor(s.color),
      level,
      standing: text(s.standing, 40) || (level == null ? COPY.learning : `Certified ${LEVEL_NAMES[level]}`),
    };
  };

  const projects = list(raw.projects).map((p) => {
    if (!p || typeof p !== 'object' || !isKey(p.key)) return null;
    return {
      key: p.key,
      title: text(p.title, 140) || COPY.untitled,
      description: text(p.description, 2000),
      note: text(p.note, 2000),
      image: safeUrl(p.image),
      company: isKey(p.company) ? p.company : null,
      month: typeof p.month === 'string' ? p.month : '',
      deliverables: list(p.deliverables)
        .map((d) => ({ title: text(d && d.title, 120), url: safeUrl(d && d.url) }))
        .filter((d) => d.url && /^https?:/i.test(d.url))
        .map((d) => ({ ...d, title: d.title || 'Deliverable' })),
    };
  }).filter(Boolean);
  const projectKeys = new Set(projects.map((p) => p.key));

  const companies = list(raw.companies).map((c) => {
    if (!c || typeof c !== 'object' || !isKey(c.key)) return null;
    const count = Number.isInteger(c.verifiedCount) && c.verifiedCount > 0 ? c.verifiedCount : 0;
    return {
      key: c.key,
      name: text(c.name, 80) || COPY.companyFallback,
      logo: safeUrl(c.logo),
      banner: safeUrl(c.banner),
      caption: text(c.caption, 80),
      current: c.current !== false,
      verifiedCount: count,
    };
  }).filter(Boolean);

  const collab = raw.collab && typeof raw.collab === 'object'
    ? {
      note: text(raw.collab.note, 120),
      skills: list(raw.collab.skills).map(skillItem).filter(Boolean).slice(0, 3),
    }
    : null;

  const skillsTitle = raw.skills && raw.skills.title === COPY.learning ? COPY.learning : COPY.expertise;
  const skillItems = raw.skills && typeof raw.skills === 'object'
    ? list(raw.skills.items).map(skillItem).filter(Boolean)
    : [];

  const gradient = Number.isInteger(raw.avatar && raw.avatar.gradient)
    ? Math.abs(raw.avatar.gradient) % 4 : 0;
  const name = text(raw.name, 80) || 'Peak member';

  return {
    handle,
    state: ['full', 'sparse', 'learning', 'empty'].includes(raw.state) ? raw.state : 'empty',
    name,
    headline: text(raw.headline, 120) || 'Building a verified portfolio',
    avatar: { url: safeUrl(raw.avatar && raw.avatar.url), gradient },
    founder: raw.founder === true,
    collab,
    featured: list(raw.featured).filter((k) => projectKeys.has(k)).slice(0, 3),
    projects,
    companies,
    skills: skillItems.length > 0 ? { title: skillsTitle, items: skillItems } : null,
    lead: typeof raw.lead === 'string' ? raw.lead : null,
    verifiedCount: projects.length,
  };
}

// ── Derived facts ───────────────────────────────────────────────────────────

/** Only pages with something earned on them are offered to search engines. */
export function isIndexable(data) {
  const certified = data.skills && data.skills.items.some((s) => s.level != null);
  return Boolean(certified) || data.verifiedCount > 0;
}

/** The lead certification: the skill the backend chose, if it is certified. */
export function leadSkill(data) {
  if (!data.skills) return null;
  const certified = data.skills.items.filter((s) => s.level != null);
  if (certified.length === 0) return null;
  return certified.find((s) => s.id === data.lead) || certified[0];
}

/** The share description, built only from what is true; never a zero. */
export function describe(data) {
  const lead = leadSkill(data);
  const parts = [];
  const automaticLines = lead
    ? [`Expert in ${lead.name}`, COPY.certifiedIn(LEVEL_NAMES[lead.level], lead.name)]
    : [];
  const headlineIsAutomatic = automaticLines.includes(data.headline) ||
    data.headline === 'Building a verified portfolio' ||
    /^Learning /.test(data.headline);

  if (data.state === 'full') {
    if (!headlineIsAutomatic || !lead) parts.push(data.headline);
    if (lead) parts.push(COPY.certifiedIn(LEVEL_NAMES[lead.level], lead.name));
    if (data.verifiedCount > 0) {
      const withWork = data.companies.filter((c) => c.verifiedCount > 0).map((c) => c.name);
      parts.push(COPY.descVerifiedAt(data.verifiedCount, withWork.length <= 2 ? withWork : []));
    }
    return clampDescription(parts.join(' · '));
  }
  const learning = data.skills && data.skills.title === COPY.learning ? data.skills.items[0] : null;
  if (learning && data.state === 'learning') {
    return clampDescription(headlineIsAutomatic
      ? COPY.descLearning(learning.name)
      : `${data.headline} · ${COPY.descLearning(learning.name)}`);
  }
  return clampDescription(headlineIsAutomatic
    ? COPY.descBuilding(data.name)
    : `${data.headline} · ${COPY.descBuilding(data.name)}`);
}

function clampDescription(s) {
  const chars = Array.from(s);
  return chars.length <= 200 ? s : `${chars.slice(0, 199).join('').trim()}…`;
}

/** A short hash of what the share image shows, for its cache-busting `v`. */
export function contentHash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 12);
}

export const canonicalUrl = (handle) => `${SITE.origin}/u/${handle}`;

// ── Images ──────────────────────────────────────────────────────────────────

function nearestSize(px) {
  return IMAGE_SIZES.find((s) => s >= px) || IMAGE_SIZES[IMAGE_SIZES.length - 1];
}

/** The URL to load: through Vercel's optimizer at a listed size when the
 *  source allows it, else as given; site assets get the page's asset base. */
function imageSrc(url, px, opts) {
  const local = url.startsWith('/assets/');
  let host = '';
  if (!local) {
    try { host = new URL(url).hostname; } catch (_) { return ''; }
  }
  if (opts.optimizeImages && (local || OPTIMIZED_HOSTS.has(host))) {
    return `/_vercel/image?url=${encodeURIComponent(url)}&w=${nearestSize(px)}&q=75`;
  }
  return local ? `${opts.assetBase}${url}` : url;
}

/**
 * An <img> that fades in over its placeholder. `data-original` lets the page
 * script fall back to the source when the optimizer fails, then remove the
 * image (uncovering the placeholder) if that fails too.
 */
function img(url, { px, width, height, cls = '', eager = false, srcsetPx, sizes }, opts) {
  const src = imageSrc(url, px, opts);
  if (!src) return '';
  const original = url.startsWith('/assets/') ? `${opts.assetBase}${url}` : url;
  const srcset = srcsetPx && opts.optimizeImages && src.startsWith('/_vercel/')
    ? ` srcset="${srcsetPx.map((w) => `${esc(imageSrc(url, w, opts))} ${nearestSize(w)}w`).join(', ')}"` +
      (sizes ? ` sizes="${esc(sizes)}"` : '')
    : '';
  return `<img class="fade${cls ? ` ${cls}` : ''}" src="${esc(src)}"${srcset}` +
    `${src !== original ? ` data-original="${esc(original)}"` : ''}` +
    ` alt="" width="${width}" height="${height}"` +
    `${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}

/** A skill's own icon on its tile, or a disc in its colour. */
function skillGlyph(skill, size, opts, cls = 'skill-glyph') {
  if (skill.icon) {
    return `<span class="${cls}">${img(`/assets/skill_icons/${skill.icon}.png`,
      { px: size * 2, width: size, height: size }, opts)}</span>`;
  }
  const color = skill.color || 'var(--blue)';
  return `<span class="${cls} disc" style="--skill:${esc(color)}"></span>`;
}

function levelIcon(level, opts) {
  return `<img class="level-icon" src="${esc(`${opts.assetBase}/assets/levels/${LEVEL_FILES[level]}.png`)}"` +
    ' alt="" width="24" height="24" loading="lazy" decoding="async">';
}

// ── Sections ────────────────────────────────────────────────────────────────

function identity(data, opts) {
  const avatarPhoto = data.avatar.url
    ? img(data.avatar.url, { px: 160, width: 80, height: 80, eager: true, cls: 'avatar-photo' }, opts)
    : '';
  const [from, to] = AVATAR_GRADIENTS[data.avatar.gradient];
  const founder = data.founder
    ? `<span class="founder" role="img" aria-label="${esc(COPY.founder)}">${ICON.rosette}</span>`
    : '';
  return `<section class="identity" aria-labelledby="person-name">` +
    `<div class="avatar-wrap"><div class="avatar" style="--g1:${from};--g2:${to}">` +
    `<span class="initials" aria-hidden="true">${esc(initials(data.name))}</span>${avatarPhoto}</div>` +
    `${founder}</div>` +
    `<h1 class="name" id="person-name">${esc(data.name)}</h1>` +
    `<p class="headline">${esc(data.headline)}</p>` +
    `</section>`;
}

/** Open to collaborate, as the app's PortfolioLookingForRow. */
function collab(data, opts) {
  const c = data.collab;
  const status = `<span class="collab-status"><span class="dot" aria-hidden="true"></span>${esc(COPY.collabStatus)}</span>`;
  if (!c.note && c.skills.length === 0) {
    return `<p class="collab-pill">${status}</p>`;
  }
  const skills = c.skills.length > 0
    ? `<p class="collab-skills"><span class="collab-glyphs" aria-hidden="true">` +
      c.skills.map((s) => skillGlyph(s, 20, opts, 'collab-glyph')).join('') +
      `</span><span>${esc(COPY.lookingFor(c.skills.map((s) => s.name)))}</span></p>`
    : '';
  return `<section class="card collab" aria-label="${esc(COPY.collabStatus)}">${status}` +
    `${c.note ? `<p class="collab-note">${esc(c.note)}</p>` : ''}${skills}</section>`;
}

/** The piece's image, else its company's banner, else the company's logo,
 *  else the app's grey band with a document glyph. Never an invented colour. */
function band(project, company, opts, { eager = false, cls = 'band' } = {}) {
  const url = project.image || (company && (company.banner || company.logo)) || '';
  const picture = url
    ? img(url, {
      px: 1200, width: 604, height: 150, eager, srcsetPx: [640, 1080, 1200],
      sizes: '(min-width: 640px) 604px, calc(100vw - 36px)',
    }, opts)
    : '';
  // The glyph marks a piece with no picture at all; a picture that fails to
  // load leaves the plain grey band.
  const glyph = picture ? '' : `<span class="band-glyph" aria-hidden="true">${ICON.doc}</span>`;
  return `<div class="${cls}">${glyph}${picture}</div>`;
}

function featuredCard(project, ctx, eager) {
  const company = project.company ? ctx.companies.get(project.company) : null;
  const note = project.note || project.description;
  return `<a class="card feat press" href="#project-${project.key}">` +
    band(project, company, ctx.opts, { eager }) +
    `<span class="feat-row"><span class="feat-text">` +
    `<span class="feat-title">${esc(project.title)}</span> ` +
    `${note ? `<span class="feat-note">${esc(note)}</span>` : ''}</span>` +
    `<span class="open-pill" aria-hidden="true">${esc(COPY.open)}</span></span></a>`;
}

function featured(data, ctx) {
  const items = data.featured.map((k) => ctx.projects.get(k)).filter(Boolean);
  const title = `<h2 class="section-title" id="featured-title">${esc(COPY.featured)}</h2>`;
  if (items.length === 1) {
    return `<section class="featured" aria-labelledby="featured-title">${title}` +
      `<div class="gutter">${featuredCard(items[0], ctx, true)}</div></section>`;
  }
  const slides = items.map((p, i) =>
    `<li class="slide" aria-roledescription="slide" aria-label="${esc(COPY.slideLabel(i + 1, items.length))}">` +
    `${featuredCard(p, ctx, i === 0)}</li>`).join('');
  const dots = items.map((_, i) => `<span class="pdot${i === 0 ? ' on' : ''}"></span>`).join('');
  return `<section class="featured" aria-labelledby="featured-title">${title}` +
    `<div class="carousel" role="region" aria-roledescription="carousel" aria-label="${esc(COPY.carouselLabel)}">` +
    `<ul class="track" data-track>${slides}</ul>` +
    `<div class="dots" aria-hidden="true" data-dots>${dots}</div>` +
    `<button class="nav prev" type="button" data-nav="-1" aria-label="${esc(COPY.previous)}" hidden>${ICON.chevronLeft}</button>` +
    `<button class="nav next" type="button" data-nav="1" aria-label="${esc(COPY.next)}" hidden>${ICON.chevronRight}</button>` +
    `</div></section>`;
}

/** Overview: Verified work, and the lead skill's depth. Only with verified
 *  work; without a certification, the Verified work tile alone, full width. */
function overview(data, opts) {
  const lead = leadSkill(data);
  const work = `<a class="card tile press" href="#work">` +
    `<span class="tile-icon seal-tile">${ICON.seal}</span>` +
    `<span class="tile-text"><span class="tile-title">${esc(COPY.verifiedWork)}</span> ` +
    `<span class="tile-value">${esc(COPY.projectCount(data.verifiedCount))}</span></span></a>`;
  const skill = lead
    ? `<a class="card tile press" href="#expertise">` +
      `<span class="tile-icon">${skillGlyph(lead, 30, opts, 'tile-skill')}</span>` +
      `<span class="tile-text"><span class="tile-title">${esc(LEVEL_NAMES[lead.level])}</span> ` +
      `<span class="tile-value">${esc(lead.name)}</span></span></a>`
    : '';
  return `<div class="overview gutter${lead ? '' : ' single'}">${work}${skill}</div>`;
}

function companyRow(company, opts) {
  const logo = `<span class="logo"><span class="logo-glyph" aria-hidden="true">${ICON.building}</span>` +
    `${company.logo ? img(company.logo, { px: 96, width: 47, height: 47 }, opts) : ''}</span>`;
  const verified = company.verifiedCount > 0
    ? `<span class="company-verified"><span class="seal-sm">${ICON.seal}</span>` +
      `${esc(COPY.verifiedProjects(company.verifiedCount))}</span>`
    : '';
  const body = `${logo}<span class="company-text">` +
    `<span class="company-name">${esc(company.name)}</span> ` +
    `${company.caption ? `<span class="company-caption">${esc(company.caption)}</span> ` : ''}` +
    `${verified}</span>`;
  // Only rows with verified work open: in the app the others open the
  // company's public page, which does not exist on the web.
  return company.verifiedCount > 0
    ? `<li><a class="card company press" href="#company-${company.key}">${body}` +
      `<span class="chevron">${ICON.chevronRight}</span></a></li>`
    : `<li><div class="card company">${body}</div></li>`;
}

function realWork(data, opts) {
  return `<section class="real-work" aria-labelledby="real-work-title">` +
    `<h2 class="section-title" id="real-work-title">${esc(COPY.realWork)}</h2>` +
    `<ul class="companies gutter">${data.companies.map((c) => companyRow(c, opts)).join('')}</ul></section>`;
}

const SKILLS_PREVIEW = 4;

function skills(data, opts) {
  const learning = data.skills.title === COPY.learning;
  const rows = data.skills.items.map((s, i) =>
    `<li class="skill-row${i >= SKILLS_PREVIEW ? ' extra' : ''}">` +
    `<span class="skill-tile">${skillGlyph(s, 37, opts)}</span>` +
    `<span class="skill-text"><span class="skill-name">${esc(s.name)}</span> ` +
    `<span class="skill-standing">${esc(learning || s.level == null ? COPY.learning : s.standing)}</span></span>` +
    `${!learning && s.level != null ? levelIcon(s.level, opts) : ''}</li>`).join('');
  const more = data.skills.items.length > SKILLS_PREVIEW
    ? `<button class="view-all" type="button" aria-expanded="false" aria-controls="skill-list" ` +
      `data-less="${esc(COPY.viewLess)}" hidden>${esc(COPY.viewAll)}</button>`
    : '';
  return `<section class="skills" id="expertise" aria-labelledby="skills-title">` +
    `<h2 class="section-title" id="skills-title">${esc(data.skills.title)}</h2>` +
    `<ul class="card skill-list" id="skill-list">${rows}</ul>${more}</section>`;
}

function emptyCard(data) {
  return `<section class="card empty gutter-card" aria-labelledby="empty-title">` +
    `<h2 class="empty-title" id="empty-title">${esc(COPY.emptyTitle)}</h2>` +
    `<p class="empty-body">${esc(COPY.emptyBody(data.name))}</p></section>`;
}

function closingCard(state, opts) {
  const empty = state === 'empty';
  const mark = empty
    ? `<img class="closing-mark" src="${esc(`${opts.assetBase}/assets/app_icon.png`)}" alt="" width="24" height="24">`
    : `<span class="closing-seal">${ICON.seal}</span>`;
  return `<section class="card closing gutter-card" aria-labelledby="closing-title">` +
    `<h2 class="closing-title" id="closing-title">${mark}${esc(empty ? COPY.closingTitleEmpty : COPY.closingTitle)}</h2>` +
    `<p class="closing-body">${esc(empty ? COPY.closingBodyEmpty : COPY.closingBody)}</p>` +
    `<a class="btn-primary press-btn" href="/get">${esc(COPY.getPeak)}</a>` +
    `<p class="tagline">${esc(COPY.tagline)}</p></section>`;
}

// ── Sheets (drill-ins), as templates the page script opens ──────────────────

function projectSheet(project, ctx) {
  const company = project.company ? ctx.companies.get(project.company) : null;
  const month = monthLabel(project.month);
  const verifiedLine = [COPY.verified, company ? COPY.approvedBy(company.name) : '', month]
    .filter(Boolean).join(' · ');
  const hasPicture = Boolean(project.image || (company && (company.banner || company.logo)));
  const note = project.note && project.note !== project.description ? project.note : '';
  const deliverables = project.deliverables.length > 0
    ? `<h3 class="sheet-h3">${esc(COPY.deliverables)}</h3><ul class="card links">` +
      project.deliverables.map((d) =>
        `<li><a class="link-row" href="${esc(d.url)}" target="_blank" rel="noopener nofollow ugc">` +
        `<span class="link-glyph">${ICON.link}</span><span class="link-title">${esc(d.title)}` +
        `<span class="sr-only"> ${esc(COPY.opensInNewTab)}</span></span>` +
        `<span class="link-out">${ICON.arrowUpRight}</span></a></li>`).join('') + '</ul>'
    : '';
  return `<template id="sheet-project-${project.key}">` +
    `${hasPicture ? band(project, company, ctx.opts, { cls: 'band sheet-band' }) : ''}` +
    `<h2 class="sheet-title" tabindex="-1">${esc(project.title)}</h2>` +
    `<p class="verified-line"><span class="seal-sm">${ICON.seal}</span>${esc(verifiedLine)}</p>` +
    `${project.description
      ? `<div class="clamp-wrap"><p class="sheet-body-text clamp" data-clamp>${esc(project.description)}</p>` +
        `<button class="show-more" type="button" data-more="${esc(COPY.showMore)}" data-less="${esc(COPY.showLess)}" hidden>${esc(COPY.showMore)}</button></div>`
      : ''}` +
    `${note ? `<h3 class="sheet-h3">${esc(COPY.whatIDid)}</h3><p class="sheet-body-text">${esc(note)}</p>` : ''}` +
    `${deliverables}</template>`;
}

function miniRow(project, ctx, { withCompany }) {
  const company = project.company ? ctx.companies.get(project.company) : null;
  const caption = [
    withCompany && company ? COPY.approvedBy(company.name) : COPY.verified,
    monthLabel(project.month),
  ].filter(Boolean).join(' · ');
  return `<li><a class="mini-row press" href="#project-${project.key}">` +
    `<span class="mini-text"><span class="mini-title">${esc(project.title)}</span> ` +
    `<span class="verified-line small"><span class="seal-sm">${ICON.seal}</span>${esc(caption)}</span></span>` +
    `<span class="chevron">${ICON.chevronRight}</span></a></li>`;
}

function companySheet(company, ctx) {
  const projects = ctx.data.projects.filter((p) => p.company === company.key);
  const logo = `<span class="logo"><span class="logo-glyph" aria-hidden="true">${ICON.building}</span>` +
    `${company.logo ? img(company.logo, { px: 96, width: 47, height: 47 }, ctx.opts) : ''}</span>`;
  return `<template id="sheet-company-${company.key}">` +
    `<div class="sheet-company">${logo}<div><h2 class="sheet-title" tabindex="-1">${esc(company.name)}</h2>` +
    `${company.caption ? `<p class="company-caption">${esc(company.caption)}</p>` : ''}</div></div>` +
    `<ul class="card mini-list">${projects.map((p) => miniRow(p, ctx, { withCompany: false })).join('')}</ul>` +
    `</template>`;
}

function workSheet(ctx) {
  return `<template id="sheet-work">` +
    `<h2 class="sheet-title" tabindex="-1">${esc(COPY.verifiedWork)}</h2>` +
    `<ul class="card mini-list">${ctx.data.projects.map((p) => miniRow(p, ctx, { withCompany: true })).join('')}</ul>` +
    `</template>`;
}

function sheetDialog() {
  return `<dialog class="sheet" id="sheet" aria-labelledby="sheet-heading">` +
    `<div class="sheet-handle" aria-hidden="true"></div>` +
    `<div class="sheet-bar">` +
    `<button class="sheet-btn sheet-back" type="button" aria-label="${esc(COPY.back)}" hidden>${ICON.chevronLeft}</button>` +
    `<button class="sheet-btn sheet-close" type="button" aria-label="${esc(COPY.close)}">${ICON.xmark}</button>` +
    `</div><div class="sheet-content" id="sheet-content"></div></dialog>`;
}

// ── Page chrome ─────────────────────────────────────────────────────────────

function topBar(name, opts) {
  return `<header class="bar" data-bar><div class="bar-inner">` +
    `<a class="brand" href="/"><img src="${esc(`${opts.assetBase}/assets/app_icon.png`)}" alt="" width="28" height="28">` +
    `<span>${esc(COPY.brand)}</span></a>` +
    `${name ? `<span class="bar-name" aria-hidden="true">${esc(name)}</span>` : ''}` +
    `</div></header>`;
}

function footer(handle) {
  const report = handle
    ? `<a href="mailto:${SITE.reportEmail}?subject=${encodeURIComponent(`Report: peakofficial.app/u/${handle}`)}">${esc(COPY.report)}</a>`
    : '';
  return `<footer class="footer"><nav aria-label="Footer"><a href="/">${esc(COPY.brand)}</a>` +
    `<a href="/files/privacy_policy.html">${esc(COPY.privacy)}</a>` +
    `<a href="/files/terms_service.html">${esc(COPY.terms)}</a>${report}</nav></footer>`;
}

function document({ title, description, robots, canonical, image, imageAlt, appArgument, ogType, body, withScript }, opts) {
  const meta = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    `<meta name="robots" content="${robots}">`,
    '<meta name="color-scheme" content="light dark">',
    '<meta name="theme-color" content="#F5F5F7" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">',
    canonical ? `<link rel="canonical" href="${esc(canonical)}">` : '',
    `<meta name="apple-itunes-app" content="app-id=${SITE.appStoreId}${appArgument ? `, app-argument=${esc(appArgument)}` : ''}">`,
    `<link rel="icon" href="${esc(`${opts.assetBase}/assets/app_icon.png`)}">`,
    `<link rel="apple-touch-icon" href="${esc(`${opts.assetBase}/assets/app_icon.png`)}">`,
    `<meta property="og:site_name" content="Peak">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    canonical ? `<meta property="og:url" content="${esc(canonical)}">` : '',
    `<meta property="og:image" content="${esc(image)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(imageAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<meta name="twitter:image:alt" content="${esc(imageAlt)}">`,
  ].filter(Boolean).join('\n');
  return `<!doctype html>\n<html lang="en">\n<head>\n${meta}\n` +
    `<script>${HEAD_SCRIPT}</script>\n<style>${STYLES}</style>\n</head>\n` +
    `<body>\n<a class="skip-link" href="#main">${esc(COPY.skipLink)}</a>\n${body}\n` +
    `${withScript ? `<script>${SCRIPT}</script>\n` : ''}</body>\n</html>\n`;
}

const DEFAULT_OPTS = {
  /** Where the page's own assets live: '' on the site, '..' for preview-out. */
  assetBase: '',
  /** Absolute origin for share-image URLs (the preview's own on previews). */
  origin: SITE.origin,
  optimizeImages: true,
  /** Previews and fixtures are never indexed. */
  noindex: false,
};

// ── Pages ───────────────────────────────────────────────────────────────────

/**
 * The portfolio page. Sections in the app's order, each only when it has
 * something true to say:
 *   identity → Open to collaborate → Featured → Overview → Real Work →
 *   Expertise / Learning → ("Just getting started" when empty) → closing card
 */
export function renderPortfolioPage(raw, options = {}) {
  const opts = { ...DEFAULT_OPTS, ...options };
  const data = normalizePortfolio(raw);
  const ctx = {
    data,
    opts,
    projects: new Map(data.projects.map((p) => [p.key, p])),
    companies: new Map(data.companies.map((c) => [c.key, c])),
  };

  const blocks = [];
  const push = (kind, html) => blocks.push({ kind, html });
  if (data.collab) push('collab', collab(data, opts));
  if (data.featured.length > 0) push('featured', featured(data, ctx));
  if (data.verifiedCount > 0) push('overview', overview(data, opts));
  if (data.companies.length > 0) push('realWork', realWork(data, opts));
  if (data.skills) push('skills', skills(data, opts));
  if (data.state === 'empty' && !data.skills && data.companies.length === 0 && data.verifiedCount === 0) {
    push('empty', emptyCard(data));
  }
  push('closing', closingCard(data.state, opts));

  // Spacing between blocks, as PortfolioView's `content` lays them out.
  const gapBefore = (prev, kind) => {
    if (kind === 'collab') return 24;
    if (!prev || prev === 'collab') return prev === 'collab' ? 30 : 40;
    if (kind === 'overview' && prev === 'featured') return 8;
    if (kind === 'realWork') return prev === 'featured' ? 8 : 30;
    // The app pads each company row 8 below, then 25 before Expertise.
    if (kind === 'skills') return prev === 'realWork' ? 33 : 30;
    if (kind === 'closing') return 40;
    return 30;
  };
  let prev = null;
  const main = blocks.map((b) => {
    const html = `<div class="block" style="margin-top:${gapBefore(prev, b.kind)}px">${b.html}</div>`;
    prev = b.kind;
    return html;
  }).join('');

  const sheets = data.verifiedCount > 0
    ? data.projects.map((p) => projectSheet(p, ctx)).join('') +
      data.companies.filter((c) => c.verifiedCount > 0).map((c) => companySheet(c, ctx)).join('') +
      workSheet(ctx) + sheetDialog()
    : '';

  const indexable = isIndexable(data) && !opts.noindex;
  const canonical = canonicalUrl(data.handle);
  const imageUrl = `${opts.origin}/u/${data.handle}/og.png?v=${contentHash(data)}`;
  return document({
    title: COPY.pageTitle(data.name),
    description: describe(data),
    robots: indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow',
    canonical,
    image: opts.ogImage || imageUrl,
    imageAlt: COPY.ogAlt(data.name, data.headline),
    appArgument: canonical,
    ogType: 'profile',
    withScript: true,
    body: topBar(data.name, opts) +
      `<main class="col" id="main">${identity(data, opts)}${main}</main>` +
      footer(data.handle) + sheets,
  }, opts);
}

function messagePage({ title, body, actions, handle }, options) {
  const opts = { ...DEFAULT_OPTS, ...options };
  return document({
    title: COPY.genericTitle,
    description: COPY.genericDescription,
    robots: 'noindex, nofollow',
    canonical: '',
    image: `${opts.origin}/assets/portfolio/og-fallback.png`,
    imageAlt: 'Peak',
    appArgument: '',
    ogType: 'website',
    withScript: false,
    body: topBar('', opts) +
      `<main class="col" id="main"><section class="card message gutter-card" aria-labelledby="message-title">` +
      `<h1 class="message-title" id="message-title">${esc(title)}</h1>` +
      `<p class="message-body">${esc(body)}</p>${actions}</section></main>` +
      footer(handle),
  }, opts);
}

/** Not found, invalid, deleted, and any future private state: one page, so it
 *  never confirms that an account exists. */
export function renderUnavailablePage(options = {}) {
  return messagePage({
    title: COPY.unavailableTitle,
    body: COPY.unavailableBody,
    actions: `<a class="btn-primary press-btn" href="/">${esc(COPY.goToPeak)}</a>`,
    handle: '',
  }, options);
}

/** The backend failed. "Try again" is a plain link to the same page, so it
 *  works without JavaScript. */
export function renderErrorPage(handle, options = {}) {
  const retry = isValidHandle(handle) ? `/u/${handle}` : '/';
  return messagePage({
    title: COPY.errorTitle,
    body: COPY.errorBody,
    actions: `<a class="btn-primary press-btn" href="${esc(retry)}">${esc(COPY.tryAgain)}</a>` +
      `<a class="text-link" href="/">${esc(COPY.goToPeak)}</a>`,
    handle: '',
  }, options);
}

export { listNames, LEVEL_NAMES, LEVEL_FILES };
