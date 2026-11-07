import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, t } from '../src/site/lib/strings.js';

test('t returns English for en, unknown codes and regions without a dictionary', () => {
  assert.deepEqual(t('en'), STRINGS.en);
  assert.deepEqual(t('pt-br'), t('en'));
  assert.deepEqual(t('xx'), t('en'));
});

test('t returns Spanish for es and for its regions', () => {
  assert.notEqual(t('es').search, STRINGS.en.search);
  assert.deepEqual(t('es-mx'), t('es'));
});

test('every dictionary has the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.es).sort(), Object.keys(STRINGS.en).sort());
});
