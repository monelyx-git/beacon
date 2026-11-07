import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from '../src/cli/build.js';

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
