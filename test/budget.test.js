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
