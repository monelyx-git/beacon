import { copyFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { build as astroBuild } from 'astro';
import { buildSearchIndex } from './search-index.js';
import { astroConfig, loadSite } from './site.js';

/** @param {string} root @returns {Promise<{outDir: string, pages: number}>} */
export async function build(root) {
  const site = await loadSite(root);
  const config = astroConfig(root, site);
  await astroBuild(config);
  await buildSearchIndex(config.outDir);
  if (site.config.logo) await copyFile(join(root, site.config.logo), join(config.outDir, basename(site.config.logo)));
  return { outDir: config.outDir, pages: site.pages.length };
}
