// GET /preview/portfolio/<name>: a fixture rendered as a real page.
// Preview deployments only; production answers 404.
import { fixturePage } from '../portfolio/handler.js';
import { hostOf, onlyReads, queryOf, send } from '../portfolio/http.js';

export default function handler(req, res) {
  if (!onlyReads(req, res)) return;
  send(res, fixturePage({ name: String(queryOf(req).name || ''), env: process.env, host: hostOf(req) }), req.method);
}
