import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSearch, loadPagefind } from '../src/site/lib/search.js';

const fakePagefind = (docs) => {
  const calls = [];
  return {
    calls,
    search: async (q) => { calls.push(q); return { results: docs.map((d) => ({ data: async () => d })) }; },
  };
};

test('blank queries return nothing and never hit the index', async () => {
  const pf = fakePagefind([{ url: '/a/', meta: { title: 'A' }, excerpt: 'x' }]);
  assert.deepEqual(await runSearch(pf, '   '), []);
  assert.deepEqual(pf.calls, []);
});

test('results are mapped to url, title and excerpt and capped by the limit', async () => {
  const docs = Array.from({ length: 12 }, (_, i) => ({ url: `/p${i}/`, meta: { title: `P${i}` }, excerpt: `e<mark>${i}</mark>` }));
  const out = await runSearch(fakePagefind(docs), ' backup ', 8);
  assert.equal(out.length, 8);
  assert.deepEqual(out[0], { url: '/p0/', title: 'P0', excerpt: 'e<mark>0</mark>' });
});

test('a result without a title falls back to its url', async () => {
  const out = await runSearch(fakePagefind([{ url: '/x/', excerpt: '' }]), 'x');
  assert.equal(out[0].title, '/x/');
});

test('loadPagefind imports once from the base path and sets the base url', async () => {
  const imported = [];
  const options = [];
  const importer = async (url) => { imported.push(url); return { options: async (o) => options.push(o), search: async () => ({ results: [] }) }; };
  const a = await loadPagefind('/docs/', importer);
  const b = await loadPagefind('/docs/', importer);
  assert.equal(a, b);
  assert.deepEqual(imported, ['/docs/pagefind/pagefind.js']);
  assert.deepEqual(options, [{ baseUrl: '/docs/' }]);
});
