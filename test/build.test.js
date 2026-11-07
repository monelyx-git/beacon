import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, rm, mkdtemp, writeFile, mkdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../src/cli/build.js';
import { measure, BUDGET } from '../scripts/measure-budget.mjs';

const fixture = new URL('./fixtures/basic/', import.meta.url).pathname;
const bin = new URL('../bin/beacon.js', import.meta.url).pathname;
after(() => rm(join(fixture, 'dist'), { recursive: true, force: true }));

test('build renders pages with sidebar nav and TOC', async () => {
  const { pages } = await build(fixture);
  assert.equal(pages, 3);
  const html = await readFile(join(fixture, 'dist/guide/intro/index.html'), 'utf8');
  assert.match(html, /<h1[^>]*>Introduction<\/h1>/);
  assert.match(html, /<nav[^>]*aria-label="Documentation"[\s\S]*href="\/guide\/setup\/"/);
  assert.match(html, /<nav[^>]*aria-label="On this page"[\s\S]*href="#why"/);
  assert.ok(await readFile(join(fixture, 'dist/index.html'), 'utf8'));
});

test('CLI exits non-zero with the config error when site is missing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-cli-'));
  await writeFile(join(dir, 'beacon.config.json'), '{}');
  const r = spawnSync('node', [bin, 'build', '--root', dir], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /"site" is required/);
});

test('exactly one h1 per page, whether the title comes from frontmatter or the content heading', async () => {
  await build(fixture);
  for (const page of ['guide/intro', 'guide/setup', '']) {
    const html = await readFile(join(fixture, 'dist', page, 'index.html'), 'utf8');
    assert.equal(html.match(/<h1[\s>]/g).length, 1, `h1 count on /${page}`);
  }
});

test('exactly one font is preloaded, self-hosted, with no Google Fonts', async () => {
  await build(fixture);
  const html = await readFile(join(fixture, 'dist/index.html'), 'utf8');
  const preloads = html.match(/<link[^>]*rel="preload"[^>]*as="font"[^>]*>/g) ?? [];
  assert.equal(preloads.length, 1);
  assert.match(preloads[0], /type="font\/woff2"/);
  assert.match(preloads[0], /crossorigin/);
  assert.match(preloads[0], /href="\/_astro\/bricolage-grotesque-latin-wght-normal[^"]*\.woff2"/);
  assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);
});

test('every page has canonical, Open Graph and description metadata', async () => {
  await build(fixture);
  const html = await readFile(join(fixture, 'dist/guide/intro/index.html'), 'utf8');
  assert.match(html, /<link rel="canonical" href="https:\/\/docs\.example\.com\/guide\/intro\/"/);
  assert.match(html, /<meta name="description" content="Why this project exists\."/);
  for (const [k, v] of [['og:title', 'Introduction'], ['og:description', 'Why this project exists.'], ['og:url', 'https://docs.example.com/guide/intro/'], ['og:image', 'https://docs.example.com/og.png']]) {
    assert.match(html, new RegExp(`<meta property="${k}" content="${v.replace(/\./g, '\\.')}"`), k);
  }
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
});

test('sitemap lists every page absolutely, robots points at it, og.png exists', async () => {
  await build(fixture);
  const sitemap = await readFile(join(fixture, 'dist/sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
  assert.deepEqual(locs, ['https://docs.example.com/', 'https://docs.example.com/guide/intro/', 'https://docs.example.com/guide/setup/']);
  assert.match(await readFile(join(fixture, 'dist/robots.txt'), 'utf8'), /^Sitemap: https:\/\/docs\.example\.com\/sitemap\.xml$/m);
  assert.equal((await readFile(join(fixture, 'dist/og.png'))).subarray(1, 4).toString(), 'PNG');
});

test('a site with a path prefix keeps links, canonical and sitemap under it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-base-'));
  await mkdir(join(dir, 'content'));
  await writeFile(join(dir, 'beacon.config.json'), JSON.stringify({ site: 'https://x.dev/docs' }));
  await writeFile(join(dir, 'content/a.md'), '# A\n\nHello there.\n');
  await writeFile(join(dir, 'content/b.md'), '# B\n\n[to a](./a.md)\n');
  await build(dir);
  const html = await readFile(join(dir, 'dist/b/index.html'), 'utf8');
  assert.match(html, /<link rel="canonical" href="https:\/\/x\.dev\/docs\/b\/"/);
  assert.match(html, /<a href="\/docs\/a\/">to a<\/a>/);
  assert.match(html, /<nav[^>]*aria-label="Documentation"[\s\S]*href="\/docs\/a\/"/);
  assert.match(await readFile(join(dir, 'dist/sitemap.xml'), 'utf8'), /<loc>https:\/\/x\.dev\/docs\/a\/<\/loc>/);
});

test('the Astro cache lives in the project, never shared between projects', async () => {
  await build(fixture);
  assert.ok((await stat(join(fixture, 'node_modules/.cache/beacon'))).isDirectory());
});

test('search index is built, only page bodies are indexed, and plain pages ship no search code', async () => {
  await build(fixture);
  assert.ok((await stat(join(fixture, 'dist/pagefind/pagefind.js'))).isFile());
  assert.ok((await stat(join(fixture, 'dist/pagefind/pagefind-entry.json'))).isFile());
  const html = await readFile(join(fixture, 'dist/guide/intro/index.html'), 'utf8');
  assert.match(html, /<main[^>]*data-pagefind-body/);
  assert.match(html, /<button[^>]*class="search-open"[^>]*aria-keyshortcuts="Control\+K Meta\+K"/);
  assert.doesNotMatch(html, /astro-island|pagefind\.js|\/pagefind\//);
  const { js } = await measure(join(fixture, 'dist'), 'guide/intro/index.html');
  assert.ok(js < 4096, `plain page JS ${js} B gz (a framework would add 9 KB or more)`);
});

test('a real page with search open stays inside the search-open JS budget', async () => {
  await build(fixture);
  const { js } = await measure(join(fixture, 'dist'), 'guide/intro/index.html', { searchOpen: true });
  assert.ok(js <= BUDGET.jsSearchOpen, `search-open JS ${js} B gz (budget ${BUDGET.jsSearchOpen})`);
});

test('a configured logo is copied into dist and used in the sidebar', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-logo-'));
  await mkdir(join(dir, 'content'));
  await writeFile(join(dir, 'beacon.config.json'), JSON.stringify({ site: 'https://x.dev', logo: 'brand.svg' }));
  await writeFile(join(dir, 'brand.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await writeFile(join(dir, 'content/a.md'), '# A\n\nHello there.\n');
  await build(dir);
  assert.match(await readFile(join(dir, 'dist/brand.svg'), 'utf8'), /<svg/);
  assert.match(await readFile(join(dir, 'dist/a/index.html'), 'utf8'), /<img src="\/brand\.svg"/);
});

test('dist/pagefind keeps only the runtime we use, not Pagefind\'s bundled UIs', async () => {
  await build(fixture);
  const files = await readdir(join(fixture, 'dist/pagefind'));
  for (const unused of ['pagefind-ui.js', 'pagefind-ui.css', 'pagefind-modular-ui.js', 'pagefind-modular-ui.css', 'pagefind-component-ui.js', 'pagefind-component-ui.css', 'pagefind-highlight.js']) {
    assert.ok(!files.includes(unused), `${unused} should not ship`);
  }
  for (const needed of ['pagefind.js', 'pagefind-worker.js', 'pagefind-entry.json']) assert.ok(files.includes(needed), `${needed} is required`);
});

// A real 1x1 PNG: Astro's own image pipeline rejects anything it cannot read metadata from.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('files and raw images in content are copied and linked from any page; Markdown images stay Astro-managed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-assets-'));
  await mkdir(join(dir, 'content/img'), { recursive: true });
  await mkdir(join(dir, 'content/files'));
  await mkdir(join(dir, 'content/guide'));
  await writeFile(join(dir, 'beacon.config.json'), JSON.stringify({ site: 'https://x.dev/docs' }));
  await writeFile(join(dir, 'content/img/pic.png'), PNG);
  await writeFile(join(dir, 'content/files/a.pdf'), '%PDF-1.4');
  await writeFile(join(dir, 'content/index.md'), '# Home\n\n![top](./img/pic.png)\n\n<img src="./img/pic.png" alt="raw">\n\n[Download](./files/a.pdf)\n');
  await writeFile(join(dir, 'content/guide/a.md'), '# A\n\n<img src="../img/pic.png" alt="rawnested">\n');
  await build(dir);
  assert.ok((await stat(join(dir, 'dist/img/pic.png'))).isFile());
  assert.ok((await stat(join(dir, 'dist/files/a.pdf'))).isFile());
  const home = await readFile(join(dir, 'dist/index.html'), 'utf8');
  assert.match(home, /<img[^>]*src="\/docs\/_astro\/pic\.[^"]+\.webp"[^>]*alt="top"/);
  assert.match(home, /<img src="\/docs\/img\/pic\.png" alt="raw">/);
  assert.match(home, /<a href="\/docs\/files\/a\.pdf">Download<\/a>/);
  assert.match(await readFile(join(dir, 'dist/guide/a/index.html'), 'utf8'), /<img src="\/docs\/img\/pic\.png" alt="rawnested">/);
});
