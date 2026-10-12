// GET /u/<handle>/image/<slot>/<version>: one portfolio image, resolved
// server-side so the page never contains a stored image URL.
import { portfolioImage } from '../portfolio/handler.js';
import { onlyReads, queryOf, send } from '../portfolio/http.js';

export default async function handler(req, res) {
  if (!onlyReads(req, res)) return;
  const query = queryOf(req);
  const result = await portfolioImage({
    rawHandle: query.handle, slot: String(query.slot || ''), version: String(query.v || ''), env: process.env,
  });
  send(res, result, req.method);
}
