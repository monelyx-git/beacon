import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dev } from '../src/cli/dev.js';

const fixture = new URL('./fixtures/basic/', import.meta.url).pathname;
const freePort = () => new Promise((resolve) => {
  const s = createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const until = async (fn, ms = 10000) => {
  for (let t = 0; t < ms; t += 200) { const v = await fn().catch(() => null); if (v) return v; await new Promise((r) => setTimeout(r, 200)); }
  throw new Error('timed out waiting for the dev server to pick up the change');
};

test('dev serves pages and picks up content and navigation edits without a restart', async () => {
  const root = await mkdtemp(join(tmpdir(), 'beacon-dev-'));
  await cp(fixture, root, { recursive: true, filter: (src) => !src.includes('/dist') });
  const server = await dev(root, { port: await freePort() });
  try {
    const get = async (path) => (await fetch(`${server.url}${path}`)).text();
    assert.match(await get('/guide/intro/'), /<h1[^>]*>Introduction<\/h1>/);

    const file = join(root, 'content/guide/intro.md');
    await writeFile(file, (await readFile(file, 'utf8')) + '\n## Fresh heading\n');
    await until(async () => (await get('/guide/intro/')).includes('id="fresh-heading"'));

    await writeFile(file, (await readFile(file, 'utf8')).replace('title: Introduction', 'title: Renamed page'));
    const html = await until(async () => { const h = await get('/guide/setup/'); return h.includes('Renamed page') && h; });
    assert.match(html, /<nav[^>]*aria-label="Documentation"[\s\S]*Renamed page/);
  } finally {
    await server.stop();
  }
});

test('dev fails fast with the config error', async () => {
  const root = await mkdtemp(join(tmpdir(), 'beacon-dev-'));
  await writeFile(join(root, 'beacon.config.json'), '{}');
  await assert.rejects(dev(root, { port: await freePort() }), /"site" is required/);
});

test('dev serves the logo from the project', async () => {
  const root = await mkdtemp(join(tmpdir(), 'beacon-dev-'));
  await cp(fixture, root, { recursive: true, filter: (src) => !src.includes('/dist') });
  await writeFile(join(root, 'brand.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await writeFile(join(root, 'beacon.config.json'), JSON.stringify({ site: 'https://docs.example.com', logo: 'brand.svg' }));
  const server = await dev(root, { port: await freePort() });
  try {
    const res = await fetch(`${server.url}/brand.svg`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /<svg/);
  } finally {
    await server.stop();
  }
});

test('dev can serve the bundled client scripts to the browser', async () => {
  const root = await mkdtemp(join(tmpdir(), 'beacon-dev-'));
  await cp(fixture, root, { recursive: true, filter: (src) => !src.includes('/dist') });
  const server = await dev(root, { port: await freePort() });
  try {
    const script = new URL('../src/site/lib/copy.js', import.meta.url).pathname;
    const res = await fetch(`${server.url}/@fs${script}`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /handleCopyClick/);
  } finally {
    await server.stop();
  }
});

test('dev serves files and raw images from content', async () => {
  const root = await mkdtemp(join(tmpdir(), 'beacon-dev-'));
  await cp(fixture, root, { recursive: true, filter: (src) => !src.includes('/dist') });
  await mkdir(join(root, 'content/img'), { recursive: true });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await writeFile(join(root, 'content/img/pic.png'), png);
  await writeFile(join(root, 'content/guide/pic.md'), '# Pic\n\n<img src="../img/pic.png" alt="raw">\n');
  const server = await dev(root, { port: await freePort() });
  try {
    const page = await (await fetch(`${server.url}/guide/pic/`)).text();
    assert.match(page, /<img src="\/img\/pic\.png" alt="raw">/);
    const res = await fetch(`${server.url}/img/pic.png`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/png');
    assert.equal((await res.arrayBuffer()).byteLength, png.length);
  } finally {
    await server.stop();
  }
});

test('dev redirects / to the first page without a root index, and serves the index once it is added', async () => {
  const root = await mkdtemp(join(tmpdir(), 'beacon-dev-'));
  await mkdir(join(root, 'content'));
  await writeFile(join(root, 'beacon.config.json'), JSON.stringify({ site: 'https://x.dev' }));
  await writeFile(join(root, 'content/a.md'), '# A\n\nHello there.\n');
  const server = await dev(root, { port: await freePort() });
  try {
    const get = async (path) => (await fetch(`${server.url}${path}`)).text();
    assert.equal(server.redirect, '/a/');
    assert.match(await get('/'), /http-equiv="refresh" content="0; url=\/a\/"/);
    await writeFile(join(root, 'content/index.md'), '# Welcome home\n\nHi.\n');
    await until(async () => /Welcome home/.test(await get('/')));
    assert.doesNotMatch(await get('/'), /http-equiv="refresh"/);
  } finally {
    await server.stop();
  }
});
