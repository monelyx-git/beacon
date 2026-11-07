import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextTab } from '../src/site/lib/tabs-logic.js';

test('arrow keys move and wrap, Home and End jump', () => {
  assert.equal(nextTab('ArrowRight', 0, 3), 1);
  assert.equal(nextTab('ArrowRight', 2, 3), 0);
  assert.equal(nextTab('ArrowDown', 1, 3), 2);
  assert.equal(nextTab('ArrowLeft', 0, 3), 2);
  assert.equal(nextTab('ArrowUp', 2, 3), 1);
  assert.equal(nextTab('Home', 2, 3), 0);
  assert.equal(nextTab('End', 0, 3), 2);
});

test('other keys are ignored', () => {
  assert.equal(nextTab('a', 0, 3), null);
  assert.equal(nextTab('Tab', 1, 3), null);
});
