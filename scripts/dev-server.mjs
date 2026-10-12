// A local stand-in for Vercel: the vercel.json routes for the portfolio, the
// /get redirect, a pass-through /_vercel/image, and static files.
//   node scripts/dev-server.mjs            → http://localhost:3000
//   PEAK_RENDER_KEY=… node scripts/dev-server.mjs   to render real handles
// Fixtures: http://localhost:3000/preview/portfolio/full (solo, sparse,
// learning, empty, edge, unavailable, error).

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixturePage, portfolioImage, portfolioPage, shareImage } from '../portfolio/handler.js';
import { send } from '../portfolio/http.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT || 3000);
const env = { ...process.env, VERCEL_ENV: 'development' };
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.woff': 'font/woff',
};

function serveStatic(res, pathname) {
  const file = normalize(join(root, decodeURIComponent(pathname)));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
  createReadStream(file).pipe(res);
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // Accessibility audits (local only): `?audit` drops the page's CSP so axe
  // can be injected, and /__dev/axe.js serves it.
  if (url.searchParams.has('audit')) {
    const setHeader = res.setHeader.bind(res);
    res.setHeader = (k, v) => (k.toLowerCase() === 'content-security-policy' ? res : setHeader(k, v));
  }
  if (url.pathname === '/__dev/axe.js') return serveStatic(res, '/node_modules/axe-core/axe.min.js');
  const path = url.pathname;
  const host = req.headers.host;
  let m;
  try {
    if ((m = /^\/u\/([^/]+)\/image\/([^/]+)\/([^/]+)$/.exec(path))) {
      return send(res, await portfolioImage({ rawHandle: m[1], slot: m[2], version: m[3], env }), req.method);
    }
    if ((m = /^\/u\/([^/]+)\/og\.png$/.exec(path))) {
      return send(res, await shareImage({ rawHandle: m[1], env }), req.method);
    }
    if ((m = /^\/u\/([^/]+)(\/?)$/.exec(path))) {
      return send(res, await portfolioPage({ rawHandle: m[1], trailingSlash: m[2] === '/', env, host }), req.method);
    }
    if ((m = /^\/preview\/portfolio\/([^/]+)\/og\.png$/.exec(path))) {
      return send(res, await shareImage({ fixture: m[1], env }), req.method);
    }
    if ((m = /^\/preview\/portfolio\/([^/]+)$/.exec(path))) {
      return send(res, fixturePage({ name: m[1], env, host }), req.method);
    }
    if (path === '/get') {
      const ua = req.headers['user-agent'] || '';
      const to = /iPhone|iPad|iPod/.test(ua) ? 'https://apps.apple.com/app/id6758958604'
        : /Android/.test(ua) ? 'https://play.google.com/store/apps/details?id=com.patchamp.peak'
          : '/files/download.html';
      res.writeHead(307, { Location: to });
      return res.end();
    }
    if (path === '/_vercel/image') {
      const source = url.searchParams.get('url') || '';
      if (source.startsWith('/')) return serveStatic(res, source);
      res.writeHead(307, { Location: source });
      return res.end();
    }
    if (path === '/') return serveStatic(res, '/index.html');
    return serveStatic(res, path);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('Dev server error');
  }
}).listen(port, () => console.log(`Peak landing dev server on http://localhost:${port}`));
