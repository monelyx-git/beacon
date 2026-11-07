#!/usr/bin/env node
// Usage: node scripts/lighthouse.mjs <dist> [page-path ...] [--runs N]. Reports the median of N runs (default 3).
// Needs a local Chrome (set CHROME_PATH if not detected).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { medianScores } from './stats.mjs';
import { extname, join, normalize } from 'node:path';

const run = promisify(execFile); // async: the static server below shares this event loop
const argv = process.argv.slice(2);
const runsAt = argv.indexOf('--runs');
const RUNS = runsAt >= 0 ? Number(argv.splice(runsAt, 2)[1]) : 3;
const [dist, ...paths] = argv;
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
  const runs = [];
  const failing = new Map();
  for (let i = 0; i < RUNS; i++) {
    const r = await run('pnpm', ['exec', 'lighthouse', `http://localhost:${port}${path}`, '--quiet', '--output=json', '--output-path=stdout',
      '--only-categories=performance,accessibility,seo', '--chrome-flags=--headless=new --no-sandbox'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120000 }).catch((e) => ({ failure: e }));
    if (r.failure) { console.error(r.failure.stderr || r.failure.message); failed = true; break; }
    const report = JSON.parse(r.stdout);
    runs.push(Object.fromEntries(Object.entries(report.categories).map(([k, v]) => [k, Math.round(v.score * 100)])));
    for (const a of Object.values(report.categories).flatMap((c) => c.auditRefs).filter((a) => a.weight > 0).map((a) => report.audits[a.id])) {
      if (a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative') failing.set(a.id, a);
    }
  }
  if (!runs.length) continue;
  const scores = medianScores(runs);
  console.log(path, JSON.stringify(scores), `(median of ${runs.length}; all runs: ${runs.map((r) => Object.values(r).join('/')).join(', ')})`);
  if (Object.values(scores).some((s) => s < 100)) {
    failed = true;
    for (const a of failing.values()) {
      console.log(`  - ${a.id}: ${a.title}`);
      for (const i of (Array.isArray(a.details?.items) ? a.details.items : []).slice(0, 2)) if (i.node?.snippet) console.log(`      ${i.node.snippet.slice(0, 140)} ${i.node.explanation?.split('\n')[1] ?? ''}`);
    }
  }
}
server.close();
process.exit(failed ? 1 : 0);
