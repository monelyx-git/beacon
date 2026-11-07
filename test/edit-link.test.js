import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editHref } from '../src/cli/edit-link.js';

test('editHref joins the url and the file path inside content', () => {
  assert.equal(editHref('https://github.com/o/r/edit/main/docs/', '/p/content', '/p/content/guide/intro.md'), 'https://github.com/o/r/edit/main/docs/guide/intro.md');
});

test('editHref encodes spaces and hashes', () => {
  assert.equal(editHref('https://x.dev/e', '/c', '/c/a b#c.md'), 'https://x.dev/e/a%20b%23c.md');
});
