#!/usr/bin/env node
// Usage: node scripts/measure-budget.mjs <dist> [page.html]. Exits 1 when over budget.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

// jsSearchOpen is a separate, owner-approved budget: Pagefind's own runtime is ~26 KB gz of it (ADR 0008).
export const BUDGET = { js: 30 * 1024, css: 20 * 1024, inlineScript: 1024, jsSearchOpen: 36 * 1024 };
const gz = (s) => gzipSync(s).length;

/** Gzipped JS/CSS bytes a page ships (external + inline), plus raw inline script size. */
export async function measure(dist, page = 'index.html', { searchOpen = false } = {}) {
  const html = await readFile(join(dist, page), 'utf8');
  const asset = (url) => readFile(join(dist, url.replace(/^\//, '')), 'utf8');
  const out = { js: 0, css: 0, inlineScript: 0 };
  const counted = new Set();
  // Counts a JS file once, plus everything it statically imports (`import"./x.js"`, `from"./x.js"`).
  const countJs = async (url, base = '/') => {
    const path = new URL(url, `http://x${base}`).pathname;
    if (counted.has(path)) return;
    counted.add(path);
    const code = await asset(path);
    out.js += gz(code);
    const imports = searchOpen ? /(?:from|import)\s*\(?\s*["'`](\.{1,2}\/[^"'`]+)["'`]/g : /(?:from|import)\s*["'`](\.{1,2}\/[^"'`]+)["'`]/g;
    for (const m of code.matchAll(imports)) await countJs(m[1], path);
  };

  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const src = m[1].match(/\bsrc="([^"]+)"/)?.[1];
    if (src) await countJs(src);
    else if (m[2].trim()) {
      out.js += gz(m[2]);
      // The 1 KB inline budget is for the theme script (the spec); bundler-inlined page scripts count toward JS only.
      if (/getItem\(['"`]beacon-theme/.test(m[2])) out.inlineScript += m[2].length;
    }
  }
  // Island JS is fetched via attributes on <astro-island>, not <script src>.
  for (const m of html.matchAll(/<astro-island\b[^>]*>/g)) {
    for (const attr of ['component-url', 'renderer-url']) {
      const url = m[0].match(new RegExp(`${attr}="([^"]+)"`))?.[1];
      if (url) await countJs(url);
    }
  }
  for (const m of html.matchAll(/<link\b[^>]*>/g)) {
    const href = m[0].includes('rel="stylesheet"') && m[0].match(/\bhref="([^"]+)"/)?.[1];
    if (href) out.css += gz(await asset(href));
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) out.css += gz(m[1]);
  if (searchOpen) for (const f of ['pagefind/pagefind.js', 'pagefind/pagefind-worker.js']) await countJs(`/${f}`);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dist, page, flag] = process.argv.slice(2);
  const searchOpen = flag === '--search-open';
  const r = await measure(dist, page, { searchOpen });
  const kb = (n) => (n / 1024).toFixed(2);
  const jsBudget = searchOpen ? BUDGET.jsSearchOpen : BUDGET.js;
  console.log(`${searchOpen ? 'search open: ' : ''}js ${kb(r.js)} KB gz (budget ${kb(jsBudget)}), css ${kb(r.css)} KB gz (budget ${kb(BUDGET.css)}), inline script ${r.inlineScript} B (budget ${BUDGET.inlineScript})`);
  process.exit(r.js > jsBudget || r.css > BUDGET.css || r.inlineScript > BUDGET.inlineScript ? 1 : 0);
}
