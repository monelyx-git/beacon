#!/usr/bin/env node
// Usage: node scripts/lighthouse.mjs <dist> [page-path ...]. Needs a local Chrome (set CHROME_PATH if not detected).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { extname, join, normalize } from 'node:path';

const run = promisify(execFile); // async: the static server below shares this event loop
const [dist, ...paths] = process.argv.slice(2);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.xml': 'application/xml', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith('/')) p += 'index.html';
  try {
    const body = await readFile(join(dist, p));
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end('not found'); }
}).listen(0);
await new Promise((r) => server.once('listening', r));
const port = server.address().port;

let failed = false;
for (const path of paths.length ? paths : ['/']) {
  const r = await run('pnpm', ['exec', 'lighthouse', `http://localhost:${port}${path}`, '--quiet', '--output=json', '--output-path=stdout',
    '--only-categories=performance,accessibility,seo', '--chrome-flags=--headless=new --no-sandbox'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120000 }).catch((e) => ({ failure: e }));
  if (r.failure) { console.error(r.failure.stderr || r.failure.message); failed = true; continue; }
  const cats = JSON.parse(r.stdout).categories;
  const scores = Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, Math.round(v.score * 100)]));
  console.log(path, JSON.stringify(scores));
  if (Object.values(scores).some((s) => s < 100)) failed = true;
}
server.close();
process.exit(failed ? 1 : 0);
