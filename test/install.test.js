import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repo = new URL('../', import.meta.url).pathname.replace(/\/$/, '');

// Reproduces an installed package: the code lives under <project>/node_modules/@monelyx/beacon.
async function installedProject() {
  const project = await mkdtemp(join(tmpdir(), 'beacon-installed-'));
  const pkg = join(project, 'node_modules/@monelyx/beacon');
  await mkdir(pkg, { recursive: true });
  for (const f of ['src', 'bin', 'package.json']) await cp(join(repo, f), join(pkg, f), { recursive: true });
  await symlink(join(repo, 'node_modules'), join(pkg, 'node_modules')); // dependencies, as a package manager would link them
  await mkdir(join(project, 'content'));
  await writeFile(join(project, 'content/index.md'), '# Installed\n\nBuilt from an installed package.\n');
  await writeFile(join(project, 'beacon.config.json'), JSON.stringify({ site: 'https://docs.example.com' }));
  return { project, pkg };
}
const run = (project, pkg) => spawnSync('node', [join(pkg, 'bin/beacon.js'), 'build', '--root', project], { encoding: 'utf8' });

test('an installed package builds: islands are compiled even though they live in node_modules', async () => {
  const { project, pkg } = await installedProject();
  const r = run(project, pkg);
  assert.equal(r.status, 0, r.stderr.split('\n').filter((l) => !/^\s+at /.test(l)).slice(0, 6).join('\n'));
  assert.match(await readFile(join(project, 'dist/index.html'), 'utf8'), /<h1[^>]*>Installed<\/h1>/);
});

// Astro writes .astro/ into the package folder and has no setting to move it, so a read-only install cannot build.
// v1 supports writable installs and must say so clearly instead of failing with a bare EACCES.
test('a read-only install fails early with a clear, actionable message', { skip: process.getuid?.() === 0 && 'root ignores permissions' }, async () => {
  const { project, pkg } = await installedProject();
  await chmod(pkg, 0o555);
  try {
    const r = run(project, pkg);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /not writable/);
    assert.match(r.stderr, /install @monelyx\/beacon where your user can write/);
    assert.doesNotMatch(r.stderr, /EACCES|astro sync/);
  } finally {
    await chmod(pkg, 0o755);
    await rm(project, { recursive: true, force: true });
  }
});
