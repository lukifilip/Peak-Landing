// GET /u/<handle> (rewritten here by vercel.json): the public portfolio page.
import { portfolioPage } from '../portfolio/handler.js';
import { hostOf, onlyReads, queryOf, send } from '../portfolio/http.js';

export default async function handler(req, res) {
  if (!onlyReads(req, res)) return;
  const query = queryOf(req);
  const result = await portfolioPage({
    rawHandle: query.handle,
    trailingSlash: query.slash === '1',
    env: process.env,
    host: hostOf(req),
  });
  send(res, result, req.method);
}
