import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anchorHeadings } from '../src/site/lib/anchors.js';

const L = 'Link to this section';
const a = (id) => `<a class="anchor" href="#${id}" aria-label="${L}" data-pagefind-ignore>#</a>`;

test('adds an anchor to h2-h4 with an id', () => {
  assert.equal(anchorHeadings('<h2 id="why">Why</h2>', L), `<h2 id="why">Why${a('why')}</h2>`);
});

test('leaves h1, h5 and id-less headings alone', () => {
  const html = '<h1 id="a">A</h1><h5 id="b">B</h5><h2>C</h2>';
  assert.equal(anchorHeadings(html, L), html);
});

test('leaves escaped heading text inside code alone', () => {
  const html = '<pre><code>&lt;h2 id="x"&gt;</code></pre>';
  assert.equal(anchorHeadings(html, L), html);
});

test('keeps heading attributes and inner markup', () => {
  assert.equal(anchorHeadings('<h3 id="a" class="k">A <code>b</code></h3>', L), `<h3 id="a" class="k">A <code>b</code>${a('a')}</h3>`);
});
