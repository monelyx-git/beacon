import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/cli/config.js';

async function project(config) {
  const dir = await mkdtemp(join(tmpdir(), 'beacon-cfg-'));
  if (config !== undefined) await writeFile(join(dir, 'beacon.config.json'), JSON.stringify(config));
  return dir;
}

test('valid config gets defaults for title and accent', async () => {
  const cfg = await loadConfig(await project({ site: 'https://docs.example.com' }));
  assert.equal(cfg.site, 'https://docs.example.com');
  assert.equal(cfg.title, 'Docs');
  assert.equal(cfg.accent, '#d2441c');
});

test('missing site names the field', async () => {
  await assert.rejects(loadConfig(await project({})), /beacon\.config: "site" is required/);
});

test('non-URL site names the field', async () => {
  await assert.rejects(loadConfig(await project({ site: 'nope' })), /"site" must be an absolute http\(s\) URL/);
});

test('invalid accent names the field', async () => {
  await assert.rejects(loadConfig(await project({ site: 'https://a.dev', accent: 'red!' })), /"accent" must be a #rrggbb color/);
});

test('low-contrast accent is rejected', async () => {
  await assert.rejects(loadConfig(await project({ site: 'https://a.dev', accent: '#f3f5f5' })), /"accent".*contrast/);
});

test('locales is returned as is', async () => {
  const cfg = await loadConfig(await project({ site: 'https://a.dev', locales: ['en', 'es'] }));
  assert.deepEqual(cfg.locales, ['en', 'es']);
});

test('absent locales leaves no locales key', async () => {
  const cfg = await loadConfig(await project({ site: 'https://a.dev' }));
  assert.equal('locales' in cfg, false);
});

test('invalid locales names the field', async () => {
  await assert.rejects(loadConfig(await project({ site: 'https://a.dev', locales: ['EN'] })), /"locales"/);
});

test('missing config file is a clear error', async () => {
  await assert.rejects(loadConfig(await project()), /no beacon\.config\.\(js\|mjs\|json\) found/);
});

test('collapsibleSidebar true is returned, absent by default', async () => {
  assert.equal((await loadConfig(await project({ site: 'https://a.dev', collapsibleSidebar: true }))).collapsibleSidebar, true);
  assert.equal('collapsibleSidebar' in (await loadConfig(await project({ site: 'https://a.dev' }))), false);
});

test('collapsibleSidebar rejects non-booleans', async () => {
  await assert.rejects(loadConfig(await project({ site: 'https://a.dev', collapsibleSidebar: 'yes' })), /"collapsibleSidebar" must be true or false/);
});
