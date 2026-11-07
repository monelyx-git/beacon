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
