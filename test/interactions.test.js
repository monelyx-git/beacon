import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapCodeBlocks } from '../src/site/lib/code-blocks.js';
import { handleCopyClick, handlePageCopyClick } from '../src/site/lib/copy.js';
import { toggleTheme } from '../src/site/lib/theme-toggle.js';
import { THEME_KEY } from '../src/site/lib/theme-script.js';

test('wrapCodeBlocks adds a copy button to highlighted blocks only', () => {
  const html = '<pre class="astro-code github-dark" tabindex="0"><code>a</code></pre><pre><code>raw</code></pre>';
  const out = wrapCodeBlocks(html);
  assert.equal(out.match(/<div class="code-block">/g).length, 1);
  assert.match(out, /<div class="code-block"><pre class="astro-code[\s\S]*<\/pre><button type="button" class="copy" aria-live="polite" data-pagefind-ignore>Copy<\/button><\/div><pre><code>raw/);
});

function copyFixture(text, clipboard) {
  const button = { textContent: 'Copy', closest: (s) => (s === '.code-block' ? block : null) };
  const block = { querySelector: (s) => (s === 'pre' ? { textContent: text } : null) };
  const target = { closest: (s) => (s === '.copy' ? button : null) };
  const timers = [];
  return { button, target, timers, run: () => handleCopyClick({ target }, clipboard, (fn) => timers.push(fn)) };
}

test('copy click writes the code text, confirms, then resets', async () => {
  const written = [];
  const f = copyFixture('npm i', { writeText: async (t) => written.push(t) });
  await f.run();
  assert.deepEqual(written, ['npm i']);
  assert.equal(f.button.textContent, 'Copied');
  f.timers[0]();
  assert.equal(f.button.textContent, 'Copy');
});

test('copy failure is reported, not thrown, and clicks elsewhere are ignored', async () => {
  const f = copyFixture('x', { writeText: async () => { throw new Error('denied'); } });
  await f.run();
  assert.equal(f.button.textContent, 'Copy failed');
  await assert.doesNotReject(handleCopyClick({ target: { closest: () => null } }, {}, () => {}));
});

test('toggleTheme flips the class, stores the choice and survives blocked storage', () => {
  const classes = new Set(['dark']);
  const root = { documentElement: { classList: { contains: (c) => classes.has(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } } };
  const stored = {};
  assert.equal(toggleTheme(root, { setItem: (k, v) => (stored[k] = v) }), false);
  assert.equal(stored[THEME_KEY], 'light');
  assert.equal(toggleTheme(root, { setItem: () => { throw new Error('blocked'); } }), true);
  assert.equal(classes.has('dark'), true);
});

function pageFixture({ fetchImpl, ClipboardItem, clipboard }) {
  const button = { textContent: 'Copy page', dataset: { md: '/guide/intro.md' } };
  const timers = [];
  const target = { closest: (s) => (s === '.copy-page' ? button : null) };
  const run = () => handlePageCopyClick({ target }, { fetch: fetchImpl, clipboard, ClipboardItem }, (fn) => timers.push(fn));
  return { button, timers, run };
}
const ok = (text) => async () => ({ ok: true, text: async () => text });

test('page copy writes the fetched Markdown and confirms', async () => {
  const written = [];
  const f = pageFixture({ fetchImpl: ok('# Hi\n'), clipboard: { writeText: async (t) => written.push(t) } });
  await f.run();
  assert.deepEqual(written, ['# Hi\n']);
  assert.equal(f.button.textContent, 'Copied');
  f.timers[0]();
  assert.equal(f.button.textContent, 'Copy page');
});

test('page copy starts a ClipboardItem write synchronously from the click', async () => {
  let release;
  const pending = new Promise((r) => { release = r; });
  const writes = [];
  class Item { constructor(data) { this.data = data; } }
  const f = pageFixture({
    fetchImpl: () => pending,
    ClipboardItem: Item,
    clipboard: { write: async ([item]) => { writes.push(item); await item.data['text/plain']; } },
  });
  const done = f.run();
  assert.equal(writes.length, 1);
  release({ ok: true, text: async () => 'x' });
  await done;
  assert.equal(f.button.textContent, 'Copied');
});

test('page copy reports a failed request without throwing', async () => {
  const clipboard = { writeText: async () => {} };
  const a = pageFixture({ fetchImpl: async () => ({ ok: false }), clipboard });
  await a.run();
  assert.equal(a.button.textContent, 'Copy failed');
  const b = pageFixture({ fetchImpl: async () => { throw new Error('offline'); }, clipboard });
  await b.run();
  assert.equal(b.button.textContent, 'Copy failed');
});

test('page copy ignores clicks elsewhere', async () => {
  await assert.doesNotReject(handlePageCopyClick({ target: { closest: () => null } }, {}, () => {}));
});
