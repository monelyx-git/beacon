import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, mkdtemp, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../src/cli/build.js';

const fixture = new URL('./fixtures/basic/', import.meta.url).pathname;
const bin = new URL('../bin/beacon.js', import.meta.url).pathname;
after(() => rm(join(fixture, 'dist'), { recursive: true, force: true }));

test('build renders pages with sidebar nav and TOC', async () => {
  const { pages } = await build(fixture);
  assert.equal(pages, 3);
  const html = await readFile(join(fixture, 'dist/guide/intro/index.html'), 'utf8');
  assert.match(html, /<h1[^>]*>Introduction<\/h1>/);
  assert.match(html, /<nav[^>]*aria-label="Documentation"[\s\S]*href="\/guide\/setup\/"/);
  assert.match(html, /<nav[^>]*aria-label="On this page"[\s\S]*href="#why"/);
  assert.ok(await readFile(join(fixture, 'dist/index.html'), 'utf8'));
});

test('CLI exits non-zero with the config error when site is missing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-cli-'));
  await writeFile(join(dir, 'beacon.config.json'), '{}');
  const r = spawnSync('node', [bin, 'build', '--root', dir], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /"site" is required/);
});

test('exactly one h1 per page, whether the title comes from frontmatter or the content heading', async () => {
  await build(fixture);
  for (const page of ['guide/intro', 'guide/setup', '']) {
    const html = await readFile(join(fixture, 'dist', page, 'index.html'), 'utf8');
    assert.equal(html.match(/<h1[\s>]/g).length, 1, `h1 count on /${page}`);
  }
});
