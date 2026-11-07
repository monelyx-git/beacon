import { test } from 'node:test';
import assert from 'node:assert/strict';
import { llmsTxt } from '../src/cli/llms.js';

const cfg = { site: 'https://docs.example.com/docs', title: 'Ex' };
const page = (slug, title, locale = 'en', description) => ({ slug, title, locale, ...(description ? { description } : {}) });

test('llmsTxt lists each page with its Markdown URL and description', () => {
  assert.equal(
    llmsTxt(cfg, [page('', 'Home', 'en', 'Welcome.'), page('guide/intro', 'Intro')], ['en']),
    '# Ex\n\n- [Home](https://docs.example.com/docs/index.md): Welcome.\n- [Intro](https://docs.example.com/docs/guide/intro.md)\n',
  );
});

test('llmsTxt groups by language only when there are several', () => {
  const out = llmsTxt(cfg, [page('a', 'A'), page('es/a', 'A es', 'es')], ['en', 'es']);
  assert.match(out, /## en\n\n- \[A\]\(https:\/\/docs\.example\.com\/docs\/a\.md\)\n\n## es\n\n- \[A es\]\(\S+es\/a\.md\)/);
  assert.doesNotMatch(llmsTxt(cfg, [page('a', 'A')], ['en']), /##/);
});

test('llmsTxt escapes brackets in titles', () => {
  assert.match(llmsTxt(cfg, [page('a', 'Use [x]')], ['en']), /- \[Use \\\[x\\\]\]\(/);
});
