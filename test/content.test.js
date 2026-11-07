import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { scanContent, buildNav, rootRedirect, mdPath, pageMarkdown } from '../src/cli/content.js';

async function tree(files) {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-content-'));
  for (const [name, body] of Object.entries(files)) {
    await mkdir(dirname(join(dir, name)), { recursive: true });
    await writeFile(join(dir, name), body);
  }
  return dir;
}
const bySlug = (pages) => Object.fromEntries(pages.map((p) => [p.slug, p]));

test('title: frontmatter, then first heading, then humanized filename', async () => {
  const pages = bySlug(await scanContent(await tree({
    'a.md': '---\ntitle: From FM\n---\n# Ignored\n',
    'b.md': 'text\n# From heading\n',
    'backups-and-restore.md': 'no heading\n',
  })));
  assert.equal(pages['a'].title, 'From FM');
  assert.equal(pages['b'].title, 'From heading');
  assert.equal(pages['backups-and-restore'].title, 'Backups and restore');
});

test('index.md becomes the folder slug; root index is empty slug', async () => {
  const pages = bySlug(await scanContent(await tree({ 'index.md': '# Home\n', 'guide/index.md': '# Guide\n' })));
  assert.ok('' in pages);
  assert.ok('guide' in pages);
});

test('order sorts within a folder, ties break alphabetically', async () => {
  const pages = await scanContent(await tree({
    'z.md': '---\norder: 1\n---\n# Z\n', 'b.md': '# B\n', 'a.md': '# A\n', 'c.md': '---\norder: 1\n---\n# C\n',
  }));
  const nav = buildNav(pages);
  assert.deepEqual(nav.map((n) => n.label), ['C', 'Z', 'A', 'B']);
});

test('folders become labelled groups with children', async () => {
  const nav = buildNav(await scanContent(await tree({ 'getting-started/x.md': '# X\n', 'getting-started/y.md': '# Y\n' })));
  assert.equal(nav[0].label, 'Getting started');
  assert.deepEqual(nav[0].children.map((c) => c.href), ['/getting-started/x/', '/getting-started/y/']);
});

test('a.md next to a/index.md names both files', async () => {
  await assert.rejects(scanContent(await tree({ 'a.md': '# A\n', 'a/index.md': '# A2\n' })), /slug collision.*a\.md.*index\.md/s);
});

test('empty or missing dir is a clear error', async () => {
  const dir = await tree({});
  await assert.rejects(scanContent(dir), /content directory is empty or missing/);
  await assert.rejects(scanContent(join(dir, 'nope')), /content directory is empty or missing/);
});

test('odd filenames become URL-safe slugs', async () => {
  const pages = await scanContent(await tree({ 'My Guide/Éxito Final.md': '# E\n' }));
  assert.equal(pages[0].slug, 'my-guide/exito-final');
});

test('root index.md leads the sidebar and folder index keeps its children', async () => {
  const nav = buildNav(await scanContent(await tree({
    'a.md': '# A\n', 'index.md': '# Home\n', 'guide/index.md': '# Guide\n', 'guide/x.md': '# X\n',
  })));
  assert.deepEqual(nav.map((n) => n.href ?? n.label), ['/', '/a/', '/guide/']);
  assert.deepEqual(nav[2].children.map((c) => c.href), ['/guide/x/']);
});

test('description: frontmatter wins, otherwise the first paragraph as plain text', async () => {
  const pages = bySlug(await scanContent(await tree({
    'a.md': '---\ndescription: From FM\n---\n# A\n\nBody.\n',
    'b.md': '# B\n\n```sh\nnope\n```\n\nFrom a **clean** server to [a deployed app](./x.md). About `10` minutes\nonce DNS has propagated.\n\nSecond paragraph.\n',
    'c.md': '# C\n\n| a | b |\n|---|---|\n| 1 | 2 |\n',
    'd.md': '# D\n\n' + 'word '.repeat(80) + '\n',
  })));
  assert.equal(pages['a'].description, 'From FM');
  assert.equal(pages['b'].description, 'From a clean server to a deployed app. About 10 minutes once DNS has propagated.');
  assert.equal(pages['c'].description, undefined);
  assert.ok(pages['d'].description.length <= 160 && pages['d'].description.endsWith('…'));
});

test('frontmatter: quotes are stripped only when they match, so titles keep their own quotes', async () => {
  const pages = bySlug(await scanContent(await tree({
    'a.md': '---\ntitle: Using "quotes"\n---\n# x\n',
    'b.md': '---\ntitle: \'Quoted\'\ndescription: "Also quoted"\n---\n# x\n',
    'c.md': '---\ntitle: "mismatch\'\n---\n# x\n',
  })));
  assert.equal(pages['a'].title, 'Using "quotes"');
  assert.equal(pages['b'].title, 'Quoted');
  assert.equal(pages['b'].description, 'Also quoted');
  assert.equal(pages['c'].title, '"mismatch\'');
});

test('frontmatter: unsupported multi-line values fail with the file and key', async () => {
  const dir = await tree({ 'a.md': '---\ndescription: >\n  folded\n---\n# A\n' });
  await assert.rejects(scanContent(dir), /a\.md.*"description".*single-line/s);
});

test('frontmatter: an empty block and a BOM do not swallow or hide content', async () => {
  const pages = bySlug(await scanContent(await tree({
    'empty.md': '---\n---\n# Real title\n\nFirst paragraph.\n\n---\n\nAfter the rule.\n',
    'bom.md': '\uFEFF---\ntitle: With BOM\n---\nBody\n',
  })));
  assert.equal(pages['empty'].title, 'Real title');
  assert.equal(pages['empty'].description, 'First paragraph.');
  assert.equal(pages['bom'].title, 'With BOM');
});

test('a file or folder name with no ASCII letters or digits is a clear error, not a wrong URL', async () => {
  await assert.rejects(scanContent(await tree({ '日本語.md': '# JP\n' })), /cannot derive a URL from "日本語\.md"/);
  await assert.rejects(scanContent(await tree({ '日本語/intro.md': '# JP\n' })), /cannot derive a URL from "日本語\/intro\.md"/);
});

test('rootRedirect: null when a root index exists, else the first sidebar page with an href', async () => {
  const withIndex = await scanContent(await tree({ 'index.md': '# Home', 'a.md': '# A' }));
  assert.equal(rootRedirect(buildNav(withIndex)), null);
  const flat = await scanContent(await tree({ 'b.md': '# B', 'a.md': '# A' }));
  assert.equal(rootRedirect(buildNav(flat)), '/a/');
  const ordered = await scanContent(await tree({ 'a.md': '# A', 'b.md': '---\norder: 1\n---\n# B' }));
  assert.equal(rootRedirect(buildNav(ordered)), '/b/');
});

test('rootRedirect: descends into groups that have no page of their own', async () => {
  const pages = await scanContent(await tree({ 'guide/deep/x.md': '# X', 'guide/y.md': '# Y', 'z.md': '# Z' }));
  assert.equal(rootRedirect(buildNav(pages)), '/guide/deep/x/');
  const onlyNested = await scanContent(await tree({ 'guide/deep/x.md': '# X' }));
  assert.equal(rootRedirect(buildNav(onlyNested)), '/guide/deep/x/');
});

test('mdPath maps slugs to files', () => {
  assert.equal(mdPath(''), 'index.md');
  assert.equal(mdPath('guide/intro'), 'guide/intro.md');
});

async function md(body) {
  const dir = await tree({ 'p.md': body });
  const [page] = await scanContent(dir);
  return pageMarkdown(page);
}

test('pageMarkdown strips frontmatter and adds the title when the body has no h1', async () => {
  assert.equal(await md('---\ntitle: Hi\n---\n\nBody\n'), '# Hi\n\nBody\n');
});

test('pageMarkdown keeps an existing h1 and does not add a second', async () => {
  assert.equal(await md('# Own\n\nBody\n\n\n'), '# Own\n\nBody\n');
});

test('pageMarkdown ignores a # line inside a code fence when deciding', async () => {
  const out = await md('---\ntitle: T\n---\n```sh\n# comment\n```\n');
  assert.ok(out.startsWith('# T\n\n```sh'));
});

test('pageMarkdown handles BOM and CRLF', async () => {
  assert.equal(await md('\uFEFF---\r\ntitle: T\r\n---\r\nBody\r\n'), '# T\n\nBody\n');
});
