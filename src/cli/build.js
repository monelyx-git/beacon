import { copyFile, mkdir } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { build as astroBuild } from 'astro';
import { buildSearchIndex } from './search-index.js';
import { astroConfig, loadSite } from './site.js';

/** @param {string} root @returns {Promise<{outDir: string, pages: number, redirect: string | null}>} */
export async function build(root) {
  const site = await loadSite(root);
  const config = astroConfig(root, site);
  await astroBuild(config);
  await buildSearchIndex(config.outDir);
  // Images and files in content/ keep their relative path, which is what the rewritten links point at.
  for (const asset of site.assets) {
    const dest = join(config.outDir, relative(site.contentDir, asset));
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(asset, dest);
  }
  if (site.config.logo) await copyFile(join(root, site.config.logo), join(config.outDir, basename(site.config.logo)));
  return { outDir: config.outDir, pages: site.pages.length, redirect: site.redirect };
}
