import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { themeScript, THEME_KEY } from '../src/site/lib/theme-script.js';

function run({ stored, prefersDark, storageThrows = false }) {
  const classes = new Set();
  const env = {
    document: { documentElement: { classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } } },
    localStorage: { getItem: (k) => { if (storageThrows) throw new Error('blocked'); return k === THEME_KEY ? stored ?? null : null; } },
    matchMedia: () => ({ matches: prefersDark }),
  };
  runInNewContext(themeScript, env);
  return classes.has('dark');
}

test('stored choice wins over the system preference', () => {
  assert.equal(run({ stored: 'dark', prefersDark: false }), true);
  assert.equal(run({ stored: 'light', prefersDark: true }), false);
});

test('no stored choice follows the system preference', () => {
  assert.equal(run({ prefersDark: true }), true);
  assert.equal(run({ prefersDark: false }), false);
});

test('blocked storage and junk values fall back to the system preference', () => {
  assert.equal(run({ prefersDark: true, storageThrows: true }), true);
  assert.equal(run({ stored: 'purple', prefersDark: false }), false);
});

test('inline script is under 1 KB', () => {
  assert.ok(themeScript.length < 1024, `${themeScript.length} bytes`);
});
