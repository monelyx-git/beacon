import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../src/cli/build.js';
import { measure, BUDGET } from '../scripts/measure-budget.mjs';

const fixture = new URL('./fixtures/components/', import.meta.url).pathname;
const page = (p) => readFile(join(fixture, 'dist', p, 'index.html'), 'utf8');
before(() => build(fixture));
after(() => rm(join(fixture, 'dist'), { recursive: true, force: true }));

test('Callout renders typed and default notes with accessible roles', async () => {
  const html = await page('static');
  assert.match(html, /<aside class="callout callout-warning" role="note"[^>]*>[\s\S]*Careful[\s\S]*Back up first\./);
  assert.match(html, /<aside class="callout callout-note" role="note"[^>]*>[\s\S]*Note[\s\S]*Plain note\./);
});

test('Steps wraps an ordered list without needing an import in the MDX', async () => {
  assert.match(await page('static'), /<div class="steps"><ol>[\s\S]*Install it[\s\S]*<\/ol><\/div>/);
});

test('static components ship no component script', async () => {
  const html = await page('static');
  assert.doesNotMatch(html, /astro-island/);
});

test('Tabs renders every panel in the HTML (no-JS fallback) and one Preact island', async () => {
  const html = await page('tabs');
  assert.equal(html.match(/<astro-island/g).length, 1);
  assert.match(html, /component-url="\/_astro\/TabsIsland[^"]*\.js"/);
  // Shiki splits "npm install" into spans, so match the words separately.
  assert.match(html, /data-tab-label="npm"[\s\S]*install[\s\S]*data-tab-label="pnpm"[\s\S]*install/);
});

test('a page with tabs and code stays inside the JS budget; a plain page ships no island', async () => {
  const withTabs = await measure(join(fixture, 'dist'), 'tabs/index.html');
  assert.ok(withTabs.js <= BUDGET.js, `tabs page JS ${withTabs.js} B gz`);
  assert.doesNotMatch(await page('static'), /astro-island/);
});

test('code blocks get a copy button and every page a theme toggle', async () => {
  const html = await page('tabs');
  assert.match(html, /<div class="code-block"><pre class="astro-code[\s\S]*<button type="button" class="copy"/);
  assert.match(html, /<button[^>]*class="theme-toggle"[^>]*aria-label="Toggle theme"/);
});

// Lives here, not in its own file: Astro builds in parallel test files race on the shared .astro/ folder.
const mdx = (word) => `# ${word}\n\n<Callout>Body.</Callout>\n\n<Tabs>\n<Tab label="a">\n\nA\n\n</Tab>\n<Tab label="b">\n\nB\n\n</Tab>\n</Tabs>\n`;

test('content components use the page language for their default labels', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-i18n-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'content/es'), { recursive: true });
  await writeFile(join(dir, 'beacon.config.json'), JSON.stringify({ site: 'https://docs.example.com', title: 'X', locales: ['en', 'es'] }));
  await writeFile(join(dir, 'content/index.mdx'), mdx('Home'));
  await writeFile(join(dir, 'content/es/index.mdx'), mdx('Inicio'));
  await build(dir);

  const es = await readFile(join(dir, 'dist/es/index.html'), 'utf8');
  assert.match(es, /<aside class="callout callout-note" role="note" aria-label="Nota">\s*<p class="callout-title">Nota<\/p>/);
  assert.match(es, /<astro-island[^>]*props="[^"]*label[^"]*Opciones/);

  const en = await readFile(join(dir, 'dist/index.html'), 'utf8');
  assert.match(en, /<p class="callout-title">Note<\/p>/);
  assert.doesNotMatch(en, /<astro-island[^>]*props="[^"]*label/);
});
