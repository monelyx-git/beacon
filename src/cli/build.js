import { copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as astroBuild } from 'astro';
import mdx from '@astrojs/mdx';
import { loadConfig } from './config.js';
import { scanContent, buildNav } from './content.js';

const pkgRoot = fileURLToPath(new URL('../../', import.meta.url));
const VIRTUAL = 'virtual:beacon';

/** Exposes config, pages and nav to the bundled site as one virtual module. */
function beaconModule(config, pages, nav) {
  const source = `
    export const config = ${JSON.stringify(config)};
    export const nav = ${JSON.stringify(nav)};
    export const pages = [${pages.map((p) => `{ ...${JSON.stringify({ slug: p.slug, file: p.file, title: p.title, description: p.description })}, load: () => import(${JSON.stringify(p.file)}) }`).join(',')}];
  `;
  return {
    name: 'beacon-module',
    resolveId: (id) => (id === VIRTUAL ? `\0${VIRTUAL}` : undefined),
    load: (id) => (id === `\0${VIRTUAL}` ? source : undefined),
  };
}

/** @param {string} root @returns {Promise<{outDir: string, pages: number}>} */
export async function build(root) {
  const config = await loadConfig(root);
  const pages = await scanContent(join(root, 'content'));
  const nav = buildNav(pages);
  const outDir = join(root, 'dist');
  const siteUrl = new URL(config.site);

  const logo = config.logo ? `/${basename(config.logo)}` : undefined;
  await astroBuild({
    root: pkgRoot,
    srcDir: join(pkgRoot, 'src/site'),
    publicDir: join(pkgRoot, 'src/site/public'),
    outDir,
    cacheDir: join(tmpdir(), 'beacon-cache'),
    configFile: false,
    site: siteUrl.origin,
    base: siteUrl.pathname,
    logLevel: 'warn',
    integrations: [mdx()],
    vite: { plugins: [beaconModule({ ...config, logo }, pages, nav)], logLevel: 'warn' },
  });
  if (config.logo) await copyFile(join(root, config.logo), join(outDir, basename(config.logo)));
  return { outDir, pages: pages.length };
}
