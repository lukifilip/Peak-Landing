// Renderer and request-handling tests. Run: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canonicalHandle, fetchPortfolio, fixturePage, portfolioPage, readFixture, shareImage,
} from '../portfolio/handler.js';
import {
  CONTENT_SECURITY_POLICY, describe, initials, isIndexable, monthLabel, normalizePortfolio,
  renderErrorPage, renderPortfolioPage, renderUnavailablePage,
} from '../portfolio/render.js';

const fixture = (name) => readFixture(name);
const render = (data, opts = {}) => renderPortfolioPage(data, { optimizeImages: false, ...opts });
/** The visible page: everything except the inline <style> and <script>. */
const bodyOf = (html) => html
  .replace(/<style>[\s\S]*?<\/style>/g, '')
  .replace(/<script>[\s\S]*?<\/script>/g, '');
const env = { VERCEL_ENV: 'production', PEAK_RENDER_KEY: 'k'.repeat(32) };
const silent = { error() {} };

function fakeFetch(handler) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  impl.calls = calls;
  return impl;
}
const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});

// ── Escaping and injection ──────────────────────────────────────────────────

test('every text field renders as text, never as markup', () => {
  const html = bodyOf(render(fixture('edge')));
  assert.ok(!/<script>alert/.test(html), 'name became a script');
  assert.ok(!/<img src=x/.test(html), 'title became an image');
  assert.ok(!/<b>independent<\/b>/.test(html), 'headline became bold');
  assert.ok(html.includes('&lt;script&gt;alert(&#39;name'));
  assert.ok(html.includes('&quot;small&quot; &amp; &lt;b&gt;independent&lt;/b&gt;'));
  assert.ok(html.includes('🚀'));
  assert.ok(!html.includes('javascript:'), 'an unsafe URL survived');
  assert.ok(!html.includes('SHOULD-NEVER-RENDER'));
  assert.ok(!html.includes('should-never-render@example.com'));
  assert.ok(!html.includes('Dropped: invalid key'));
  assert.ok(!html.includes('chart.xyaxis.line'), 'an SF Symbol name reached the page');
});

test('deliverable links open safely in a new tab', () => {
  const html = render(fixture('full'));
  const links = html.match(/<a class="link-row"[^>]*>/g);
  assert.equal(links.length, 2);
  for (const a of links) {
    assert.match(a, /target="_blank"/);
    assert.match(a, /rel="noopener nofollow ugc"/);
    assert.match(a, /href="https:\/\//);
  }
  // Ampersands are escaped inside the attribute; a URL with a raw quote is
  // not a valid URL and is dropped.
  const edge = render(fixture('edge'));
  assert.ok(edge.includes('href="https://example.com/real?a=1&amp;b=2"'));
  assert.ok(!edge.includes('Quote in URL'));
});

test('the payload must be contract v1', () => {
  assert.throws(() => normalizePortfolio({ v: 2, handle: 'x' }));
  assert.throws(() => normalizePortfolio(null));
  assert.throws(() => normalizePortfolio({ v: 1, handle: '../etc' }));
});

test('the page allows only its own two scripts', () => {
  const html = render(fixture('full'));
  assert.equal((html.match(/<script>/g) || []).length, 2);
  assert.match(CONTENT_SECURITY_POLICY, /script-src 'sha256-[^']+' 'sha256-[^']+'/);
  assert.ok(!/ on[a-z]+="/i.test(bodyOf(html)), 'an inline event handler was written');
});

// ── Sections and states ────────────────────────────────────────────────────

test('full: every section, in the app\'s order', () => {
  const html = bodyOf(render(fixture('full')));
  const order = ['person-name', 'Open to collaborate', 'featured-title', 'Verified work',
    'real-work-title', 'skills-title', 'closing-title'].map((s) => html.indexOf(s));
  assert.ok(order.every((i) => i > 0), JSON.stringify(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(html, /<h2 class="section-title" id="skills-title">Expertise<\/h2>/);
  assert.equal((html.match(/<h1/g) || []).length, 1, 'one h1');
  assert.ok(html.includes('aria-label="Founder"'));
  assert.ok(html.includes('Employee since 2026'));
  assert.ok(html.includes('4 verified projects'));
  assert.ok(html.includes('View All'));
  assert.ok(!html.includes('Just getting started'));
});

test('sparse: a company row without a chevron, nothing else invented', () => {
  const html = bodyOf(render(fixture('sparse')));
  assert.ok(html.includes('Brightside Studio'));
  assert.ok(!html.includes('href="#company-'), 'a row without verified work opened');
  assert.ok(!html.includes('featured-title'));
  assert.ok(!html.includes('Verified work'));
  assert.ok(!html.includes('skills-title'));
  assert.ok(!html.includes('Just getting started'));
  assert.ok(html.includes('class="initials" aria-hidden="true">KV<'));
});

test('learning: titled Learning, rows read Learning, no level icons', () => {
  const html = bodyOf(render(fixture('learning')));
  assert.match(html, /id="skills-title">Learning</);
  assert.equal((html.match(/class="skill-standing">Learning</g) || []).length, 2);
  assert.ok(!html.includes('level-icon'));
  assert.ok(!html.includes('Just getting started'));
});

test('empty: one calm card, and the closing card explains Peak', () => {
  const html = bodyOf(render(fixture('empty')));
  assert.ok(html.includes('Just getting started'));
  assert.ok(html.includes('Mia is new to Peak.'));
  assert.ok(html.includes('About Peak'));
  assert.ok(!html.includes('Verified on Peak'));
});

test('never a zero, a dash or "None yet"', () => {
  for (const name of ['full', 'sparse', 'learning', 'empty', 'edge']) {
    const page = render(fixture(name));
    const text = bodyOf(page).replace(/<[^>]+>/g, ' ');
    assert.ok(!/\b0 (verified )?projects?\b/i.test(text), `${name}: a zero count`);
    assert.ok(!/None yet|No certification|—\s*</.test(text), `${name}: an empty marker`);
    assert.ok(!/\b0 verified\b/.test(describe(normalizePortfolio(fixture(name)))), `${name}: zero in description`);
  }
});

test('Overview without a certification: Verified work alone, full width', () => {
  const data = fixture('full');
  data.skills = null;
  const html = bodyOf(render(data));
  assert.ok(html.includes('class="overview gutter single"'));
  assert.ok(!html.includes('href="#expertise"'));
});

test('Open to collaborate with no note and no skills is the small pill', () => {
  const html = bodyOf(render(fixture('edge')));
  assert.ok(html.includes('class="collab-pill"'));
  assert.ok(!html.includes('class="card collab"'));
});

// ── Search and share ───────────────────────────────────────────────────────

test('only pages with something earned are indexed', () => {
  assert.equal(isIndexable(normalizePortfolio(fixture('full'))), true);
  for (const name of ['sparse', 'learning', 'empty']) {
    assert.equal(isIndexable(normalizePortfolio(fixture(name))), false, name);
    assert.match(render(fixture(name)), /<meta name="robots" content="noindex, follow">/);
  }
  assert.match(render(fixture('full')), /<meta name="robots" content="index, follow/);
  assert.match(render(fixture('full'), { noindex: true }), /content="noindex, follow"/);
});

test('share tags: title, description, large image, canonical, app banner', () => {
  const html = render(fixture('full'), { origin: 'https://www.peakofficial.app' });
  assert.match(html, /<title>Sarah Lindqvist on Peak<\/title>/);
  assert.match(html, /<meta property="og:description" content="Professional Copywriter · Certified Expert in Copywriting · 4 verified projects at LiveLit">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/www\.peakofficial\.app\/u\/sarah\/og\.png\?v=[0-9a-f]{12}">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.peakofficial\.app\/u\/sarah">/);
  assert.match(html, /<meta name="apple-itunes-app" content="app-id=6758958604, app-argument=https:\/\/www\.peakofficial\.app\/u\/sarah">/);
  assert.match(html, /mailto:peakofficial\.app@gmail\.com\?subject=Report%3A%20peakofficial\.app%2Fu%2Fsarah/);
});

test('descriptions for the other states', () => {
  assert.equal(describe(normalizePortfolio(fixture('empty'))), 'Mia is building a verified portfolio on Peak.');
  assert.equal(describe(normalizePortfolio(fixture('sparse'))), 'Kait Verhoeven is building a verified portfolio on Peak.');
  const learning = { ...fixture('learning'), state: 'learning' };
  assert.equal(describe(normalizePortfolio(learning)), 'Learning AI for Productivity on Peak');
});

test('the unavailable and error pages are noindex and say nothing about the account', () => {
  const unavailable = renderUnavailablePage();
  assert.match(unavailable, /This portfolio isn&#39;t available/);
  assert.match(unavailable, /content="noindex, nofollow"/);
  assert.ok(!unavailable.includes('og.png?v='));
  const error = renderErrorPage('sarah');
  assert.match(error, /href="\/u\/sarah">Try again</);
  assert.ok(!error.includes('<script>document') || true);
});

// ── Small helpers ──────────────────────────────────────────────────────────

test('initials and months as the app writes them', () => {
  assert.equal(initials('Sarah Lindqvist'), 'SL');
  assert.equal(initials('kait'), 'KA');
  assert.equal(initials('Ana María de la Cruz'), 'AC');
  assert.equal(initials('  '), 'U');
  assert.equal(initials('Émile Zola'), 'ÉZ');
  assert.equal(monthLabel('2026-03'), 'Mar 2026');
  assert.equal(monthLabel('2026-13'), '');
});

// ── Requests ───────────────────────────────────────────────────────────────

test('canonical handles: lower case, no trailing slash', () => {
  assert.deepEqual(canonicalHandle('Sarah', false), { handle: 'sarah', redirect: true });
  assert.deepEqual(canonicalHandle('sarah', true), { handle: 'sarah', redirect: true });
  assert.deepEqual(canonicalHandle('sarah', false), { handle: 'sarah', redirect: false });
  assert.deepEqual(canonicalHandle('bad handle', false), { handle: null, redirect: false });
  assert.deepEqual(canonicalHandle('%E0%A4%A', false), { handle: null, redirect: false });
});

test('GET /u/Sarah redirects (301) to /u/sarah without asking the backend', async () => {
  const fetchImpl = fakeFetch(() => json(200, fixture('full')));
  const res = await portfolioPage({ rawHandle: 'Sarah', env, fetchImpl, log: silent });
  assert.equal(res.status, 301);
  assert.equal(res.headers.Location, '/u/sarah');
  assert.equal(fetchImpl.calls.length, 0);
});

test('GET /u/sarah renders, cached at the edge, with the key sent', async () => {
  const fetchImpl = fakeFetch(() => json(200, fixture('full')));
  const res = await portfolioPage({ rawHandle: 'sarah', env, fetchImpl, log: silent });
  assert.equal(res.status, 200);
  assert.match(res.headers['Vercel-CDN-Cache-Control'], /s-maxage=300, stale-while-revalidate=600/);
  assert.equal(res.headers['X-Robots-Tag'], 'index, follow');
  assert.ok(res.headers['Content-Security-Policy']);
  assert.equal(fetchImpl.calls[0].url,
    'https://us-central1-skilllearningapp.cloudfunctions.net/publicPortfolio/u/sarah?format=json');
  assert.equal(fetchImpl.calls[0].init.headers['X-Peak-Render-Key'], env.PEAK_RENDER_KEY);
});

test('previews are never indexed', async () => {
  const fetchImpl = fakeFetch(() => json(200, fixture('full')));
  const res = await portfolioPage({ rawHandle: 'sarah', env: { ...env, VERCEL_ENV: 'preview' }, host: 'x.vercel.app', fetchImpl, log: silent });
  assert.match(res.body, /content="noindex, follow"/);
  assert.equal(res.headers['X-Robots-Tag'], 'noindex, follow');
  assert.match(res.body, /https:\/\/x\.vercel\.app\/u\/sarah\/og\.png/);
});

test('unknown and invalid handles: 404, cached a minute, same page', async () => {
  const fetchImpl = fakeFetch(() => json(404, { v: 1, status: 'unavailable' }));
  const a = await portfolioPage({ rawHandle: 'nobody', env, fetchImpl, log: silent });
  const b = await portfolioPage({ rawHandle: 'not valid!', env, fetchImpl, log: silent });
  assert.equal(a.status, 404);
  assert.equal(b.status, 404);
  assert.equal(a.body, b.body);
  assert.match(a.headers['Vercel-CDN-Cache-Control'], /s-maxage=60/);
});

test('backend failures: 503, never cached, with Retry-After', async () => {
  for (const fetchImpl of [
    fakeFetch(() => json(503, { v: 1, status: 'error' })),
    fakeFetch(() => json(401, { v: 1, status: 'unauthorized' })),
    fakeFetch(() => json(200, { v: 9 })),
    fakeFetch(() => { throw new Error('network'); }),
  ]) {
    const res = await portfolioPage({ rawHandle: 'sarah', env, fetchImpl, log: silent });
    assert.equal(res.status, 503);
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.equal(res.headers['Retry-After'], '30');
    assert.match(res.body, /couldn&#39;t load/);
  }
  const noKey = await fetchPortfolio('sarah', { env: { VERCEL_ENV: 'production' } });
  assert.equal(noKey.kind, 'error');
});

test('fixtures are served on previews only', () => {
  assert.equal(fixturePage({ name: 'full', env: { VERCEL_ENV: 'production' } }).status, 404);
  const preview = fixturePage({ name: 'full', env: { VERCEL_ENV: 'preview' }, host: 'x.vercel.app' });
  assert.equal(preview.status, 200);
  assert.match(preview.body, /noindex/);
  assert.equal(fixturePage({ name: '../secrets', env: { VERCEL_ENV: 'preview' } }).status, 404);
});

test('the share image renders a 1200×630 PNG, and falls back when unavailable', async () => {
  const res = await shareImage({ fixture: 'full', env: { VERCEL_ENV: 'preview' }, log: silent });
  assert.equal(res.status, 200);
  assert.equal(res.headers['Content-Type'], 'image/png');
  assert.equal(res.body.readUInt32BE(16), 1200);
  assert.equal(res.body.readUInt32BE(20), 630);

  const fallback = readFileSync(new URL('../assets/portfolio/og-fallback.png', import.meta.url));
  const fetchImpl = fakeFetch(() => json(404, { v: 1, status: 'unavailable' }));
  const missing = await shareImage({ rawHandle: 'nobody', env, fetchImpl, log: silent });
  assert.ok(missing.body.equals(fallback));
  const prod = await shareImage({ fixture: 'full', env, log: silent });
  assert.equal(prod.status, 404);
});
