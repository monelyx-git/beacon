#!/usr/bin/env node
// Real-browser checks over the Chrome DevTools protocol, no dependencies.
// Usage: node scripts/e2e.mjs [dist]  (default: builds test/fixtures/components). Set CHROME_PATH if Chrome is not detected.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../src/cli/build.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const chromePath = process.env.CHROME_PATH ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find(existsSync);
if (!chromePath) { console.error('e2e: Chrome not found, set CHROME_PATH'); process.exit(1); }

const fixture = join(repo, 'test/fixtures/components');
const dist = process.argv[2] ?? (await build(fixture)).outDir;

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.xml': 'application/xml', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith('/')) p += 'index.html';
  let body;
  try { body = await readFile(join(dist, p)); } catch { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' }).end(body);
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(chromePath, ['--headless=new', '--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${await mkdtemp(join(tmpdir(), 'beacon-e2e-'))}`, '--no-first-run', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const debugUrl = await new Promise((resolve, reject) => {
  let buf = '';
  chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) resolve(m[1]); });
  chrome.on('exit', () => reject(new Error('Chrome exited early')));
});
const port = new URL(debugUrl).port;
const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const exceptions = []; const consoleErrors = [];
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data);
  if (m.id && pending.has(m.id)) pending.get(m.id)(m);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push(m.params.args.map((a) => a.description ?? a.value).join(' '));
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.result.value;
const waitFor = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 100) { if (await ev(expr)) return true; await sleep(100); } return false; };
// Chrome only treats these as real key presses when both virtual key codes are set.
const key = async (k, extra = {}) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, nativeVirtualKeyCode: extra.windowsVirtualKeyCode, ...extra }); };
const click = async (selector) => {
  await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block: 'center'})`);
  const r = JSON.parse(await ev(`JSON.stringify(document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect())`));
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: r.x + r.width / 2, y: r.y + r.height / 2, button: 'left', clickCount: 1 });
};

const failures = [];
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` ${detail}`}`); if (!ok) failures.push(name); };
const hidden = () => ev(`JSON.stringify([...document.querySelectorAll('[data-tab-label]')].map((p) => p.hidden))`);

await send('Runtime.enable'); await send('Page.enable');
await send('Browser.grantPermissions', { permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'], origin });
await send('Page.navigate', { url: `${origin}/tabs/` });

check('tabs hydrate into a tablist', await waitFor(`document.querySelectorAll('[role=tab]').length === 2`));
check('only the first panel is visible', (await hidden()) === '[false,true]', await hidden());
await click('[role=tab]:nth-child(2)');
check('clicking a tab switches the panel', await waitFor(`JSON.stringify([...document.querySelectorAll('[data-tab-label]')].map((p) => p.hidden)) === '[true,false]'`));
await ev(`document.querySelector('[role=tablist]').dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}))`);
check('ArrowLeft returns to the first tab', await waitFor(`JSON.stringify([...document.querySelectorAll('[data-tab-label]')].map((p) => p.hidden)) === '[false,true]'`));

await click('.copy');
check('copy button confirms', await waitFor(`document.querySelector('.copy').textContent === 'Copied'`));
check('clipboard holds the code', (await ev(`navigator.clipboard.readText()`)) === 'npm install');

const dark = await ev(`document.documentElement.classList.contains('dark')`);
await click('.theme-toggle');
check('theme toggle flips the theme and stores it', (await ev(`document.documentElement.classList.contains('dark')`)) !== dark && (await ev(`localStorage.getItem('beacon-theme')`)) === (dark ? 'light' : 'dark'));

check('search code is not loaded before it is opened', !(await ev(`performance.getEntriesByType('resource').some((r) => r.name.includes('pagefind') || r.name.includes('search-mount'))`)));
const mod = process.platform === 'darwin' ? 4 : 2;
await key('k', { modifiers: mod, code: 'KeyK', windowsVirtualKeyCode: 75 });
check('Cmd/Ctrl+K opens search with the input focused', (await waitFor(`!!document.querySelector('dialog.search[open]')`)) && (await ev(`document.activeElement?.type === 'search'`)));
await send('Input.insertText', { text: 'install' });
check('searching returns results', await waitFor(`document.querySelectorAll('.search li a').length > 0`), `${await ev(`document.querySelector('.search-status')?.textContent`)} ${consoleErrors.join(' | ')}`);
check('results link into the site', await ev(`[...document.querySelectorAll('.search li a')].every((a) => a.getAttribute('href').startsWith('/'))`));
await key('Escape', { code: 'Escape', windowsVirtualKeyCode: 27 });
check('Escape closes search', await waitFor(`!document.querySelector('dialog.search[open]')`));
await key('k', { modifiers: mod, code: 'KeyK', windowsVirtualKeyCode: 75 });
check('search reopens', await waitFor(`!!document.querySelector('dialog.search[open]')`));
await ev(`(() => { const i = document.querySelector('.search input'); i.value = ''; })()`);
await send('Input.insertText', { text: 'zebraword' });
check('page text that looks like markup finds the page', await waitFor(`[...document.querySelectorAll('.search li a')].some((a) => a.getAttribute('href').includes('/hostile/'))`));
check('result excerpts never contain live elements other than <mark>', await ev(`[...document.querySelectorAll('.search li span *')].every((e) => e.tagName === 'MARK') && window.__xss === undefined`));

check('no uncaught JS exceptions', exceptions.length === 0, exceptions.join(' | '));
ws.close(); chrome.kill(); server.close();
console.log(failures.length ? `\ne2e: ${failures.length} check(s) failed` : '\ne2e: all checks passed');
process.exit(failures.length ? 1 : 0);
