import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
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
