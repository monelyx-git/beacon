import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = (name) => readFile(new URL(`../src/site/styles/${name}.css`, import.meta.url), 'utf8');
const defined = (src) => new Set([...src.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));

test('custom properties defined by Beacon never shadow the vendored Pier tokens', async () => {
  const tokens = defined(await css('tokens'));
  const ours = [...defined(await css('base')), ...defined(await css('layout'))];
  assert.deepEqual(ours.filter((p) => tokens.has(p)), []);
});
