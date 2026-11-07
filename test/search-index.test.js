import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSearchIndex } from '../src/cli/search-index.js';

const page = (lang, text) =>
  `<!doctype html><html lang="${lang}"><head><title>${text}</title></head><body><main data-pagefind-body>${text}</main></body></html>`;

test('buildSearchIndex splits the index by html lang', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-search-index-'));
  try {
    await mkdir(join(dir, 'es'));
    await writeFile(join(dir, 'index.html'), page('en', 'hello'));
    await writeFile(join(dir, 'es', 'index.html'), page('es', 'hola'));
    await buildSearchIndex(dir);
    const entry = JSON.parse(await readFile(join(dir, 'pagefind', 'pagefind-entry.json'), 'utf8'));
    assert.deepEqual(Object.keys(entry.languages).sort(), ['en', 'es']);
    for (const lang of Object.values(entry.languages)) assert.equal(lang.page_count, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
