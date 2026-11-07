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

const MOTION = '@media (prefers-reduced-motion: no-preference)';
// Drops the balanced `{ ... }` block that follows the first MOTION query.
function withoutMotionBlock(src) {
  const start = src.indexOf(MOTION);
  if (start < 0) return src;
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}' && --depth === 0) return src.slice(0, start) + src.slice(i + 1);
  }
  return src;
}

test('motion lives only inside the no-preference media query', async () => {
  const motion = await css('motion');
  assert.ok(motion.includes(MOTION));
  for (const name of ['tokens', 'base', 'layout', 'motion']) {
    assert.doesNotMatch(withoutMotionBlock(await css(name)), /\b(transition|animation|animation-name|scroll-behavior)\b|@keyframes/, name);
  }
});
