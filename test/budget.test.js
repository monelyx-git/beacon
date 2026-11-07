import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { measure } from '../scripts/measure-budget.mjs';

test('measure counts external and inline JS and CSS gzipped', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-budget-'));
  await mkdir(join(dir, '_astro'));
  const js = 'console.log("x".repeat(2000));'.repeat(20);
  const css = 'a{color:red}'.repeat(500);
  await writeFile(join(dir, '_astro/a.js'), js);
  await writeFile(join(dir, '_astro/a.css'), css);
  await writeFile(join(dir, 'index.html'),
    '<html><head><link rel="stylesheet" href="/_astro/a.css"><style>b{color:blue}</style>' +
    '<script>var t=1;</script><script type="module" src="/_astro/a.js"></script></head></html>');
  const r = await measure(dir, 'index.html');
  assert.equal(r.js, gzipSync(js).length + gzipSync('var t=1;').length);
  assert.equal(r.css, gzipSync(css).length + gzipSync('b{color:blue}').length);
  assert.equal(r.inlineScript, 'var t=1;'.length);
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
