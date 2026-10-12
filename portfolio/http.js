// Write a { status, headers, body } result to a Node response (Vercel
// functions and the local dev server).

export function send(res, { status, headers, body }, method = 'GET') {
  res.statusCode = status;
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(method === 'HEAD' ? undefined : body);
}

/** Query parameters, whether or not the platform parsed them already. */
export function queryOf(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  return Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
}

export function onlyReads(req, res) {
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  res.statusCode = 405;
  res.setHeader('Allow', 'GET, HEAD');
  res.end('Method Not Allowed');
  return false;
}

export const hostOf = (req) => req.headers['x-forwarded-host'] || req.headers.host || '';
