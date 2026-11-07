import { test } from 'node:test';
import assert from 'node:assert/strict';
import { median, medianScores } from '../scripts/stats.mjs';

test('median of odd and even counts, input untouched', () => {
  const xs = [100, 82, 100];
  assert.equal(median(xs), 100);
  assert.deepEqual(xs, [100, 82, 100]);
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test('medianScores takes the median per category, so one cold run does not fail a page', () => {
  const runs = [
    { performance: 82, accessibility: 100, seo: 100 },
    { performance: 100, accessibility: 100, seo: 100 },
    { performance: 100, accessibility: 95, seo: 100 },
  ];
  assert.deepEqual(medianScores(runs), { performance: 100, accessibility: 100, seo: 100 });
});

test('a consistently low score still fails', () => {
  const runs = [{ seo: 90 }, { seo: 90 }, { seo: 100 }];
  assert.deepEqual(medianScores(runs), { seo: 90 });
});
