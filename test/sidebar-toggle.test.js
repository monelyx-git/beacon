import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toggleSidebar, isSidebarShortcut } from '../src/site/lib/sidebar-toggle.js';
import { SIDEBAR_KEY } from '../src/site/lib/theme-script.js';

const fakeDoc = () => {
  const classes = new Set();
  return { classes, documentElement: { classList: { contains: (c) => classes.has(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } } };
};

test('toggleSidebar flips the class and stores the choice', () => {
  const doc = fakeDoc();
  const stored = [];
  const storage = { setItem: (k, v) => stored.push([k, v]) };
  assert.equal(toggleSidebar(doc, storage), true);
  assert.equal(doc.classes.has('sidebar-hidden'), true);
  assert.equal(toggleSidebar(doc, storage), false);
  assert.deepEqual(stored, [[SIDEBAR_KEY, 'hidden'], [SIDEBAR_KEY, 'visible']]);
});

test('toggleSidebar survives blocked storage', () => {
  const doc = fakeDoc();
  assert.equal(toggleSidebar(doc, { setItem: () => { throw new Error('blocked'); } }), true);
  assert.equal(doc.classes.has('sidebar-hidden'), true);
});

test('isSidebarShortcut is a plain [ outside text fields', () => {
  assert.equal(isSidebarShortcut({ key: '[' }), true);
  assert.equal(isSidebarShortcut({ key: '[', metaKey: true }), false);
  assert.equal(isSidebarShortcut({ key: '[', target: { closest: () => ({}) } }), false);
  assert.equal(isSidebarShortcut({ key: ']' }), false);
});
