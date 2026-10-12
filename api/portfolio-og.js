// GET /u/<handle>/og.png and /preview/portfolio/<name>/og.png: the share image.
import { shareImage } from '../portfolio/handler.js';
import { onlyReads, queryOf, send } from '../portfolio/http.js';

export default async function handler(req, res) {
  if (!onlyReads(req, res)) return;
  const query = queryOf(req);
  const result = await shareImage({ rawHandle: query.handle, fixture: query.fixture, env: process.env });
  send(res, result, req.method);
}
