import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spy } from '../src/site/lib/toc-spy.js';

function fixture() {
  const link = (id) => {
    const attrs = new Map();
    return { hash: `#${id}`, setAttribute: (k, v) => attrs.set(k, v), removeAttribute: (k) => attrs.delete(k), has: (k) => attrs.has(k) };
  };
  const links = [link('one'), link('two')];
  const root = { querySelectorAll: () => links };
  const doc = { getElementById: (id) => ({ id }) };
  let callback;
  const observed = [];
  class IO { constructor(cb) { callback = cb; } observe(el) { observed.push(el.id); } }
  return { links, root, doc, IO, observed, fire: (entries) => callback(entries) };
}

test('observes every heading the TOC links to', () => {
  const f = fixture();
  spy(f.root, f.doc, f.IO);
  assert.deepEqual(f.observed, ['one', 'two']);
});

test('marks only the intersecting heading as current', () => {
  const f = fixture();
  spy(f.root, f.doc, f.IO);
  f.fire([{ isIntersecting: true, target: { id: 'one' } }]);
  f.fire([{ isIntersecting: true, target: { id: 'two' } }]);
  assert.equal(f.links[0].has('aria-current'), false);
  assert.equal(f.links[1].has('aria-current'), true);
});

test('does nothing without IntersectionObserver or links', () => {
  const f = fixture();
  assert.doesNotThrow(() => spy(f.root, f.doc, undefined));
  assert.doesNotThrow(() => spy({ querySelectorAll: () => [] }, f.doc, f.IO));
});
