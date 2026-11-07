import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLink, rewriteLinks } from '../src/cli/links.js';

const pages = [
  { slug: 'getting-started', file: '/c/getting-started.md' },
  { slug: 'install', file: '/c/install.md' },
  { slug: 'guide', file: '/c/guide/index.md' },
  { slug: 'guide/setup', file: '/c/guide/setup.mdx' },
];
const from = '/c/getting-started.md';

test('relative .md link becomes a site path', () => {
  assert.deepEqual(resolveLink(from, './install.md', pages), { href: '/install/' });
  assert.deepEqual(resolveLink(from, 'install.md', pages), { href: '/install/' });
});

test('anchor and query survive the rewrite', () => {
  assert.deepEqual(resolveLink(from, './install.md#linux', pages), { href: '/install/#linux' });
});

test('links into subfolders and index pages resolve', () => {
  assert.deepEqual(resolveLink(from, 'guide/setup.mdx', pages), { href: '/guide/setup/' });
  assert.deepEqual(resolveLink(from, 'guide/index.md', pages), { href: '/guide/' });
  assert.deepEqual(resolveLink('/c/guide/setup.mdx', '../install.md', pages), { href: '/install/' });
});

test('links to pages outside content are out of scope', () => {
  assert.deepEqual(resolveLink(from, './troubleshooting.md', pages), { outOfScope: true });
  assert.deepEqual(resolveLink(from, './adr/0034-userns.md', pages), { outOfScope: true });
});

test('external, anchor-only, mailto and root-absolute links pass through', () => {
  for (const href of ['https://example.com/x.md', '//cdn.example.com/a', '#local', 'mailto:a@b.dev', '/already/site/path', './diagram.png']) {
    assert.deepEqual(resolveLink(from, href, pages), { href }, href);
  }
});

test('rewriteLinks rewrites doc links, adds the base path, and unwraps out-of-scope links with a warning', () => {
  const warnings = [];
  const html = '<p><a href="./install.md#x">i</a> <a class="k" href="./gone.md">g <em>e</em></a> <a href="https://e.dev">e</a></p>';
  const out = rewriteLinks(html, from, pages, { base: '/docs/', warn: (m) => warnings.push(m) });
  assert.equal(out, '<p><a href="/docs/install/#x">i</a> g <em>e</em> <a href="https://e.dev">e</a></p>');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /getting-started\.md: link to \.\/gone\.md is outside content, rendered as text/);
});

test('percent-encoded links resolve to files with spaces in their names', () => {
  const withSpace = [...pages, { slug: 'my-page', file: '/c/my page.md' }];
  assert.deepEqual(resolveLink(from, './my%20page.md#x', withSpace), { href: '/my-page/#x' });
  assert.deepEqual(resolveLink(from, './bad%zz.md', withSpace), { outOfScope: true });
});

test('rewriteLinks maps relative images and files to their copied location under the base', () => {
  const assets = new Set(['/c/img/pic.png', '/c/guide/files/a.pdf']);
  const opts = { base: '/docs/', assets, contentDir: '/c', warn: () => {} };
  const html = '<p><img src="./img/pic.png" alt="p"><a href="files/a.pdf">pdf</a><img src="https://e.dev/x.png"></p>';
  assert.equal(rewriteLinks(html, '/c/getting-started.md', pages, opts),
    '<p><img src="/docs/img/pic.png" alt="p"><a href="files/a.pdf">pdf</a><img src="https://e.dev/x.png"></p>');
  assert.equal(rewriteLinks('<img src="../img/pic.png"><a href="files/a.pdf?x=1#y">f</a>', '/c/guide/setup.mdx', pages, opts),
    '<img src="/docs/img/pic.png"><a href="/docs/guide/files/a.pdf?x=1#y">f</a>');
});

test('a relative image that does not exist in content warns and is left alone', () => {
  const warnings = [];
  const out = rewriteLinks('<img src="./missing.png">', from, pages, { assets: new Set(), contentDir: '/c', warn: (m) => warnings.push(m) });
  assert.equal(out, '<img src="./missing.png">');
  assert.match(warnings[0], /getting-started\.md: image \.\/missing\.png was not found in content/);
});
