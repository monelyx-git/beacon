import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { ogImage } from '../src/cli/og.js';

test('ogImage is a valid 1200x630 RGB PNG with the accent bar on top', () => {
  const png = ogImage({ background: '#12303f', accent: '#d2441c' });
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  const idatLen = png.readUInt32BE(33);
  const raw = inflateSync(png.subarray(41, 41 + idatLen));
  assert.equal(raw.length, 630 * (1 + 1200 * 3));
  assert.deepEqual([...raw.subarray(1, 4)], [0xd2, 0x44, 0x1c]); // first pixel, top row
  const lastRow = 629 * (1 + 1200 * 3) + 1;
  assert.deepEqual([...raw.subarray(lastRow, lastRow + 3)], [0x12, 0x30, 0x3f]);
});
