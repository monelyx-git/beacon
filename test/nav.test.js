import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siblings } from '../src/site/lib/nav.js';

const nav = [
  { label: 'Home', href: '/', children: [] },
  { label: 'Guide', href: '/guide/', children: [
    { label: 'A', href: '/guide/a/', children: [] },
    { label: 'B', href: '/guide/b/', children: [] },
  ] },
];

test('siblings walks the sidebar order depth-first', () => {
  assert.deepEqual(siblings(nav, '/guide/').prev.href, '/');
  assert.deepEqual(siblings(nav, '/guide/').next.href, '/guide/a/');
  assert.equal(siblings(nav, '/guide/a/').next.href, '/guide/b/');
  assert.equal(siblings(nav, '/').prev, undefined);
  assert.equal(siblings(nav, '/guide/b/').next, undefined);
});

test('siblings is empty for an href not in the nav and for a one-page nav', () => {
  assert.deepEqual(siblings(nav, '/nope/'), {});
  const one = siblings([{ label: 'Only', href: '/', children: [] }], '/');
  assert.equal(one.prev ?? one.next, undefined);
});
