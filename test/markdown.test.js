import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from '../src/cli/build.js';

const fixture = new URL('./fixtures/fidelity/', import.meta.url).pathname;
const page = (p) => readFile(join(fixture, 'dist', p, 'index.html'), 'utf8');
before(() => build(fixture));
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
