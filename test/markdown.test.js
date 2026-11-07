import { test, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from '../src/cli/build.js';

const fixture = new URL('./fixtures/fidelity/', import.meta.url).pathname;
const page = (p) => readFile(join(fixture, 'dist', p, 'index.html'), 'utf8');
const warnings = [];
before(async () => {
  mock.method(console, 'warn', (m) => warnings.push(String(m)));
  await build(fixture);
  mock.restoreAll();
});
after(() => rm(join(fixture, 'dist'), { recursive: true, force: true }));

test('.md keeps raw HTML and literal braces and angle brackets', async () => {
  const html = await page('raw');
  assert.match(html, /<details><summary>More<\/summary>Hidden text<\/details>/);
  assert.match(html, /Use \{braces\} and a &lt; b in prose\./);
});

test('.md renders GFM tables and task lists', async () => {
  const html = await page('raw');
  assert.match(html, /<table>[\s\S]*<td>one<\/td>/);
  assert.equal(html.match(/<input[^>]*type="checkbox"/g).length, 2);
});

test('.mdx evaluates JSX expressions', async () => {
  assert.match(await page('jsx'), /Two plus two is 4\./);
});

test('headings get stable ids and the TOC links to them', async () => {
  const html = await page('raw');
  assert.match(html, /<h2 id="second-heading">/);
  assert.match(html, /<nav[^>]*aria-label="On this page"[\s\S]*href="#second-heading"/);
});

test('doc links are rewritten and out-of-scope links become text with a warning', async () => {
  const html = await page('links');
  assert.match(html, /<a href="\/raw\/#second-heading">doc<\/a>/);
  assert.match(html, /<a href="https:\/\/example\.com">ext<\/a>/);
  assert.match(html, /<a href="#links">local<\/a>/);
  assert.match(html, /and gone and/);
  assert.doesNotMatch(html, /troubleshooting\.md/);
  assert.ok(warnings.some((w) => /links\.md.*troubleshooting\.md is outside content, rendered as text/.test(w)), warnings.join('\n'));
});
