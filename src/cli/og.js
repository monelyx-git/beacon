import { crc32, deflateSync } from 'node:zlib';

const W = 1200, H = 630, BAR = 16;
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

/** Default Open Graph card: brand background with an accent bar. No text, so no font or image dependency. */
export function ogImage({ background, accent }) {
  const rowOf = (c) => Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: W }, () => c).flat())]);
  const [top, rest] = [rowOf(rgb(accent)), rowOf(rgb(background))];
  const raw = Buffer.concat(Array.from({ length: H }, (_, y) => (y < BAR ? top : rest)));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
