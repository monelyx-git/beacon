#!/usr/bin/env node
// Usage: node scripts/measure-budget.mjs <dist> [page.html]. Exits 1 when over budget.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const BUDGET = { js: 30 * 1024, css: 20 * 1024, inlineScript: 1024 };
const gz = (s) => gzipSync(s).length;

/** Gzipped JS/CSS bytes a page ships (external + inline), plus raw inline script size. */
export async function measure(dist, page = 'index.html') {
  const html = await readFile(join(dist, page), 'utf8');
  const asset = (url) => readFile(join(dist, url.replace(/^\//, '')), 'utf8');
  const out = { js: 0, css: 0, inlineScript: 0 };

  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const src = m[1].match(/\bsrc="([^"]+)"/)?.[1];
    if (src) out.js += gz(await asset(src));
    else if (m[2].trim()) { out.js += gz(m[2]); out.inlineScript += m[2].length; }
  }
  for (const m of html.matchAll(/<link\b[^>]*>/g)) {
    const href = m[0].includes('rel="stylesheet"') && m[0].match(/\bhref="([^"]+)"/)?.[1];
    if (href) out.css += gz(await asset(href));
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) out.css += gz(m[1]);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dist, page] = process.argv.slice(2);
  const r = await measure(dist, page);
  const kb = (n) => (n / 1024).toFixed(2);
  console.log(`js ${kb(r.js)} KB gz (budget ${kb(BUDGET.js)}), css ${kb(r.css)} KB gz (budget ${kb(BUDGET.css)}), inline script ${r.inlineScript} B (budget ${BUDGET.inlineScript})`);
  process.exit(Object.keys(BUDGET).some((k) => r[k] > BUDGET[k]) ? 1 : 0);
}
