import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { measure, BUDGET } from '../scripts/measure-budget.mjs';

const theme = "var t=localStorage.getItem('beacon-theme');";

test('measure counts external and inline JS and CSS gzipped', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-budget-'));
  await mkdir(join(dir, '_astro'));
  const js = 'console.log("x".repeat(2000));'.repeat(20);
  const css = 'a{color:red}'.repeat(500);
  await writeFile(join(dir, '_astro/a.js'), js);
  await writeFile(join(dir, '_astro/a.css'), css);
  await writeFile(join(dir, 'index.html'),
    '<html><head><link rel="stylesheet" href="/_astro/a.css"><style>b{color:blue}</style>' +
    `<script>${theme}</script><script type="module" src="/_astro/a.js"></script></head></html>`);
  const r = await measure(dir, 'index.html');
  assert.equal(r.js, gzipSync(js).length + gzipSync(theme).length);
  assert.equal(r.css, gzipSync(css).length + gzipSync('b{color:blue}').length);
  assert.equal(r.inlineScript, theme.length);
});

test('measure counts island JS loaded through astro-island attributes and its static imports', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-budget-'));
  await mkdir(join(dir, '_astro'));
  const island = 'export default () => 1;'.repeat(50);
  const renderer = 'import"./react.js";export default () => 2;'.repeat(1) + 'x'.repeat(3000);
  const react = 'export const r = 3;' + 'y'.repeat(5000);
  await writeFile(join(dir, '_astro/island.js'), island);
  await writeFile(join(dir, '_astro/client.js'), renderer);
  await writeFile(join(dir, '_astro/react.js'), react);
  await writeFile(join(dir, 'index.html'),
    '<astro-island component-url="/_astro/island.js" renderer-url="/_astro/client.js"></astro-island>');
  const r = await measure(dir, 'index.html');
  assert.equal(r.js, gzipSync(island).length + gzipSync(renderer).length + gzipSync(react).length);
});

test('inlineScript is the theme script only; other inline scripts count toward JS', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-budget-'));
  const boot = 'customElements.define("astro-island",class{});' + 'z'.repeat(5000);
  const other = "localStorage.setItem('beacon-theme','dark');"; // the toggle shares the key but is not the theme script
  await writeFile(join(dir, 'index.html'), `<script>${boot}</script><script>${other}</script><script>${theme}</script>`);
  const r = await measure(dir, 'index.html');
  assert.equal(r.inlineScript, theme.length);
  assert.equal(r.js, gzipSync(boot).length + gzipSync(other).length + gzipSync(theme).length);
});

test('searchOpen also counts lazily imported chunks and the Pagefind runtime', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-budget-'));
  await mkdir(join(dir, '_astro'));
  await mkdir(join(dir, 'pagefind'));
  // The minifier emits template literals for specifiers, e.g. import(`./search.js`).
  const page = 'document.addEventListener("click",()=>import(`./search.js`));';
  const search = 'import"./preact.js";export const open=1;';
  const preact = 'export const p=' + '"x".repeat(4000);'.repeat(2);
  const pf = 'pagefind'.repeat(500);
  const worker = 'worker'.repeat(500);
  for (const [f, c] of [['_astro/page.js', page], ['_astro/search.js', search], ['_astro/preact.js', preact], ['pagefind/pagefind.js', pf], ['pagefind/pagefind-worker.js', worker]]) await writeFile(join(dir, f), c);
  await writeFile(join(dir, 'index.html'), '<script type="module" src="/_astro/page.js"></script>');
  const plain = await measure(dir, 'index.html');
  assert.equal(plain.js, gzipSync(page).length);
  const open = await measure(dir, 'index.html', { searchOpen: true });
  assert.equal(open.js, [page, search, preact, pf, worker].reduce((n, c) => n + gzipSync(c).length, 0));
});

test('the search-open budget is its own, larger number; the reading budget is unchanged', () => {
  assert.equal(BUDGET.js, 30 * 1024);
  assert.equal(BUDGET.jsSearchOpen, 36 * 1024);
});
