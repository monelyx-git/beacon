import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../src/cli/build.js';

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
