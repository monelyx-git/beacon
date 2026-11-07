import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from '../src/cli/build.js';

const root = new URL('./fixtures/reader/', import.meta.url).pathname;
const read = (p) => readFile(join(root, 'dist', p), 'utf8');

before(() => build(root));
after(() => rm(join(root, 'dist'), { recursive: true, force: true }));

test('pages ship a sidebar toggle wired to the sidebar', async () => {
  const html = await read('guide/intro/index.html');
  assert.match(html, /<button[^>]*class="sidebar-toggle"[^>]*aria-controls="sidebar"[^>]*aria-expanded="true"/);
  assert.match(html, /<aside[^>]*id="sidebar"/);
});

const sidebar = (html) => html.match(/<nav[^>]*aria-label="Documentation"[\s\S]*?<\/nav>/)[0];

test('collapsible groups open on the branch holding the current page', async () => {
  const tuning = sidebar(await read('guide/advanced/tuning/index.html'));
  assert.match(tuning, /<details open>(?:(?!<\/details>)[\s\S])*Advanced/);
  assert.doesNotMatch(sidebar(await read('index.html')), /<details open/);
});

test('pages end with a pager in the page language', async () => {
  const intro = await read('guide/intro/index.html');
  assert.match(intro, /<nav class="pager" aria-label="Previous and next page"[^>]*data-pagefind-ignore/);
  assert.match(intro, /class="pager"[\s\S]*href="\/guide\/setup\/"/);
  assert.doesNotMatch(await read('index.html'), /<small>Previous<\/small>/);
  assert.doesNotMatch(await read('404.html'), /class="pager"/);
});

test('anchors do not enter the search text or the TOC', async () => {
  const html = await read('guide/intro/index.html');
  assert.match(html, /<h2 id="why">Why<a class="anchor"[^>]*data-pagefind-ignore>#<\/a><\/h2>/);
  assert.match(html, /<a href="#why">Why<\/a>/);
});

test('edit link points at the source file', async () => {
  const html = await read('guide/intro/index.html');
  assert.match(html, /href="https:\/\/github\.com\/acme\/docs\/edit\/main\/docs\/guide\/intro\.md"[^>]*>Edit this page</);
  assert.doesNotMatch(await read('404.html'), /Edit this page/);
});
