// /u/<handle> and its share image: fetch the sanitized JSON from the
// `publicPortfolio` Cloud Function and answer with HTML (or a PNG).
// Framework-free: each function returns { status, headers, body } so the
// Vercel functions, the local dev server and the tests share one path.

import { readFileSync } from 'node:fs';
import {
  CONTENT_SECURITY_POLICY, SITE, isValidHandle, normalizePortfolio,
  renderErrorPage, renderPortfolioPage, renderUnavailablePage,
} from './render.js';

export const DEFAULT_SOURCE_URL =
  'https://us-central1-skilllearningapp.cloudfunctions.net/publicPortfolio';
const FETCH_TIMEOUT_MS = 8000;

const SECURITY_HEADERS = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

// Browsers always revalidate; Vercel's edge keeps a page 5 minutes fresh, then
// serves it for 10 more while it refreshes, and keeps a day's copy for errors.
const CACHE = {
  page: {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Vercel-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600, stale-if-error=86400',
  },
  unavailable: {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
  },
  never: { 'Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store' },
  image: {
    'Cache-Control': 'public, max-age=86400',
    'Vercel-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
  },
};

const html = (status, body, headers) => ({
  status,
  headers: { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS, ...headers },
  body,
});

/** Where this deployment lives and how it may render. */
export function deploymentOptions(env, host) {
  const production = env.VERCEL_ENV === 'production';
  const origin = production || !host ? SITE.origin : `https://${host}`;
  return {
    production,
    render: { origin, assetBase: '', optimizeImages: env.PEAK_OPTIMIZE_IMAGES !== '0', noindex: !production },
  };
}

/**
 * The handle as typed, checked and made canonical. A valid handle that is not
 * already canonical (capitals, a trailing slash) redirects.
 */
export function canonicalHandle(rawHandle, trailingSlash) {
  let decoded = '';
  try { decoded = decodeURIComponent(String(rawHandle || '')).trim(); } catch (_) { decoded = ''; }
  const handle = decoded.toLowerCase();
  if (!isValidHandle(handle)) return { handle: null, redirect: false };
  return { handle, redirect: trailingSlash || decoded !== handle };
}

/**
 * Ask the Cloud Function for one portfolio.
 *   { kind: 'ok', data } | { kind: 'unavailable' } | { kind: 'error', reason }
 */
export async function fetchPortfolio(handle, { env, fetchImpl = fetch }) {
  const key = env.PEAK_RENDER_KEY;
  if (!key) return { kind: 'error', reason: 'PEAK_RENDER_KEY is not set' };
  const base = (env.PEAK_PORTFOLIO_SOURCE_URL || DEFAULT_SOURCE_URL).replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${base}/u/${encodeURIComponent(handle)}?format=json`, {
      headers: { 'X-Peak-Render-Key': key, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (response.status === 404) return { kind: 'unavailable' };
    if (!response.ok) return { kind: 'error', reason: `source answered ${response.status}` };
    const raw = await response.json();
    normalizePortfolio(raw); // throws on anything that is not contract v1
    return { kind: 'ok', data: raw };
  } catch (err) {
    return { kind: 'error', reason: err.name === 'AbortError' ? 'source timed out' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

/** GET /u/<handle> */
export async function portfolioPage({ rawHandle, trailingSlash = false, env, host, fetchImpl, log = console }) {
  const { render } = deploymentOptions(env, host);
  const { handle, redirect } = canonicalHandle(rawHandle, trailingSlash);
  if (!handle) return html(404, renderUnavailablePage(render), CACHE.unavailable);
  if (redirect) {
    return { status: 301, headers: { Location: `/u/${handle}`, ...CACHE.page }, body: '' };
  }

  const result = await fetchPortfolio(handle, { env, fetchImpl });
  if (result.kind === 'unavailable') return html(404, renderUnavailablePage(render), CACHE.unavailable);
  if (result.kind === 'error') {
    log.error(`[portfolio] /u/${handle}: ${result.reason}`);
    return html(503, renderErrorPage(handle, render), { ...CACHE.never, 'Retry-After': '30' });
  }
  try {
    const page = renderPortfolioPage(result.data, render);
    const indexable = /<meta name="robots" content="index/.test(page);
    return html(200, page, { ...CACHE.page, 'X-Robots-Tag': indexable ? 'index, follow' : 'noindex, follow' });
  } catch (err) {
    log.error(`[portfolio] /u/${handle} render failed: ${err.message}`);
    return html(503, renderErrorPage(handle, render), { ...CACHE.never, 'Retry-After': '30' });
  }
}

// ── Fixtures (previews and local only) ─────────────────────────────────────

export const FIXTURE_NAMES = ['full', 'sparse', 'learning', 'empty', 'edge'];

export function readFixture(name) {
  if (!FIXTURE_NAMES.includes(name)) return null;
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
}

/** GET /preview/portfolio/<name>: never in production, never indexed. */
export function fixturePage({ name, env, host }) {
  const { production, render } = deploymentOptions(env, host);
  if (production) return html(404, renderUnavailablePage(render), CACHE.never);
  if (name === 'unavailable') return html(404, renderUnavailablePage(render), CACHE.never);
  if (name === 'error') return html(503, renderErrorPage('sarah', render), CACHE.never);
  const fixture = readFixture(name);
  if (!fixture) return html(404, renderUnavailablePage(render), CACHE.never);
  const page = renderPortfolioPage(fixture, {
    ...render,
    noindex: true,
    ogImage: `${render.origin}/preview/portfolio/${name}/og.png`,
  });
  return html(200, page, { ...CACHE.never, 'X-Robots-Tag': 'noindex, nofollow' });
}

// ── The share image ────────────────────────────────────────────────────────

const PHOTO_TIMEOUT_MS = 2500;

/** The avatar as a data URI, or null: a slow or broken photo never breaks the card. */
export async function fetchPhoto(url, fetchImpl = fetch) {
  if (!/^https:\/\//.test(url || '')) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PHOTO_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !/^image\/(png|jpe?g|webp|gif)/.test(type)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024) return null;
    return `data:${type.split(';')[0]};base64,${bytes.toString('base64')}`;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const png = (status, body, headers) => ({
  status,
  headers: { 'Content-Type': 'image/png', 'X-Content-Type-Options': 'nosniff', ...headers },
  body,
});

function fallbackImage() {
  return readFileSync(new URL('../assets/portfolio/og-fallback.png', import.meta.url));
}

/** GET /u/<handle>/og.png and /preview/portfolio/<name>/og.png */
export async function shareImage({ rawHandle, fixture, env, fetchImpl = fetch, log = console }) {
  const { renderShareImage } = await import('./og.js');
  let raw = null;
  if (fixture) {
    if (env.VERCEL_ENV === 'production') return png(404, fallbackImage(), CACHE.never);
    raw = readFixture(fixture);
  } else {
    const { handle } = canonicalHandle(rawHandle, false);
    if (handle) {
      const result = await fetchPortfolio(handle, { env, fetchImpl });
      if (result.kind === 'ok') raw = result.data;
      else if (result.kind === 'error') log.error(`[portfolio-og] /u/${handle}: ${result.reason}`);
    }
  }
  if (!raw) return png(200, fallbackImage(), CACHE.unavailable);
  try {
    const avatarUrl = raw.avatar && raw.avatar.url;
    const photo = fixture && typeof avatarUrl === 'string' && avatarUrl.startsWith('/assets/')
      ? `data:image/png;base64,${readFileSync(new URL(`..${avatarUrl}`, import.meta.url)).toString('base64')}`
      : await fetchPhoto(avatarUrl, fetchImpl);
    const response = renderShareImage(raw, { photo });
    const body = Buffer.from(await response.arrayBuffer());
    return png(200, body, fixture ? CACHE.never : CACHE.image);
  } catch (err) {
    log.error(`[portfolio-og] render failed: ${err.message}`);
    return png(200, fallbackImage(), CACHE.unavailable);
  }
}
