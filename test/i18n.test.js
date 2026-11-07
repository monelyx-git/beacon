import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../src/cli/build.js';

const multi = new URL('./fixtures/i18n/', import.meta.url).pathname;
const single = new URL('./fixtures/i18n-single/', import.meta.url).pathname;
const warnings = [];
const read = (root, p) => readFile(join(root, 'dist', p), 'utf8');
const sidebar = (html) => html.match(/<nav[^>]*aria-label="(?:Documentation|Documentación)"[\s\S]*?<\/nav>/)?.[0] ?? '';
const switcher = (html) => html.match(/<nav class="lang-switch"[\s\S]*?<\/nav>/)?.[0] ?? '';

before(async () => {
  const warn = console.warn;
  console.warn = (...a) => warnings.push(a.join(' '));
  try {
    await build(multi);
  } finally {
    console.warn = warn;
  }
  await build(single);
});
after(async () => {
  for (const d of [multi, single]) await rm(join(d, 'dist'), { recursive: true, force: true });
});

test('each language page declares its own lang', async () => {
  assert.match(await read(multi, 'guide/intro/index.html'), /<html lang="en"/);
  assert.match(await read(multi, 'es/guide/intro/index.html'), /<html lang="es"/);
});

test('each sidebar lists only its own language', async () => {
  const es = sidebar(await read(multi, 'es/guide/intro/index.html'));
  assert.match(es, /\/es\/guide\/intro\//);
  assert.doesNotMatch(es, /\/guide\/setup\//);
  const en = sidebar(await read(multi, 'guide/intro/index.html'));
  assert.ok(en.includes('/guide/intro/'));
  assert.doesNotMatch(en, /\/es\//);
});

test('the switcher links to the translation, or to the other language home', async () => {
  assert.match(switcher(await read(multi, 'guide/intro/index.html')), /href="\/es\/guide\/intro\/"[^>]*hreflang="es"/);
  assert.match(switcher(await read(multi, 'guide/setup/index.html')), /href="\/es\/"[^>]*hreflang="es"/);
  assert.match(switcher(await read(multi, 'es/only-es/index.html')), /href="\/"[^>]*hreflang="en"/);
});

test('translated pages get hreflang alternates and untranslated ones none', async () => {
  const intro = await read(multi, 'guide/intro/index.html');
  assert.match(intro, /<link rel="alternate" hreflang="es"/);
  assert.match(intro, /<link rel="alternate" hreflang="x-default"/);
  assert.doesNotMatch(await read(multi, 'guide/setup/index.html'), /<link rel="alternate"/);
});

test('links in a Spanish page resolve to the Spanish sibling and the default-only page', async () => {
  const html = await read(multi, 'es/guide/intro/index.html');
  assert.match(html, /<a href="\/es\/guide\/intro\/">hermana<\/a>/);
  assert.match(html, /<a href="\/guide\/setup\/">setup<\/a>/);
});

test('search indexes both languages and the sitemap lists translated pages', async () => {
  const entry = JSON.parse(await read(multi, 'pagefind/pagefind-entry.json'));
  assert.ok('en' in entry.languages && 'es' in entry.languages);
  assert.match(await read(multi, 'sitemap.xml'), /<loc>https:\/\/docs\.example\.com\/es\/guide\/intro\/<\/loc>/);
});

test('the build warns about pages with no translation', () => {
  assert.ok(warnings.some((w) => /"es"/.test(w) && /\/guide\/setup\//.test(w)), warnings.join('\n'));
});

test('a single non-English locale renders Spanish chrome and no switcher', async () => {
  const html = await read(single, 'index.html');
  assert.match(html, /<html lang="es"/);
  assert.match(html, /aria-label="Documentación"/);
  assert.match(html, /Cambiar tema/);
  assert.doesNotMatch(html, /lang-switch/);
});

async function project(config, files) {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-i18n-'));
  await writeFile(join(dir, 'beacon.config.json'), JSON.stringify({ site: 'https://x.dev', ...config }));
  for (const [name, body] of Object.entries(files)) {
    await mkdir(join(dir, 'content', name, '..'), { recursive: true });
    await writeFile(join(dir, 'content', name), body);
  }
  return dir;
}

test('a locale with no content makes the build fail naming it', async () => {
  const dir = await project({ locales: ['en', 'fr'] }, { 'a.md': '# A\n\nHi.\n' });
  await assert.rejects(build(dir), /fr/);
});

test('content under the default language folder is rejected', async () => {
  const dir = await project({ locales: ['en', 'es'] }, { 'en/x.md': '# X\n\nHi.\n', 'es/y.md': '# Y\n\nHola.\n' });
  await assert.rejects(build(dir), /content\/en\//);
});
