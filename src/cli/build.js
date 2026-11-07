import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { build as astroBuild } from 'astro';
import { mdPath, pageMarkdown } from './content.js';
import { buildSearchIndex } from './search-index.js';
import { astroConfig, loadSite } from './site.js';

/** @param {string} root @returns {Promise<{outDir: string, pages: number, redirect: string | null}>} */
export async function build(root) {
  const site = await loadSite(root);
  const config = astroConfig(root, site);
  await astroBuild(config);
  await buildSearchIndex(config.outDir);
  for (const [code, rels] of Object.entries(site.missing)) {
    console.warn(`beacon: "${code}" is missing translations for: ${rels.map((r) => (r ? `/${r}/` : '/')).join(', ')}`);
  }
  // Images and files in content/ keep their relative path, which is what the rewritten links point at.
  for (const asset of site.assets) {
    const dest = join(config.outDir, relative(site.contentDir, asset));
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(asset, dest);
  }
  // Every page is also published as Markdown: the copy-page button fetches it and llms.txt links to it.
  for (const page of site.pages) await writeFile(join(config.outDir, mdPath(page.slug)), await pageMarkdown(page));
  for (const file of [site.config.logo, site.config.favicon].filter(Boolean)) await copyFile(join(root, file), join(config.outDir, basename(file)));
  return { outDir: config.outDir, pages: site.pages.length, redirect: site.redirect };
}
