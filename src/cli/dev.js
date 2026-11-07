import { realpath } from 'node:fs/promises';
import { dev as astroDev } from 'astro';
import { astroConfig, loadSite } from './site.js';

/** Starts the dev server. Search is not available in dev (the index is built by `beacon build`). */
export async function dev(projectRoot, { port = 4321 } = {}) {
  // The file watcher reports real paths; through a symlink (macOS /var, /tmp) edits would never match the imported ones.
  const root = await realpath(projectRoot);
  const site = await loadSite(root);
  const server = await astroDev({ ...astroConfig(root, site, { watch: true }), server: { port, host: '127.0.0.1' } });
  const base = new URL(site.config.site).pathname.replace(/\/$/, '');
  return { url: `http://127.0.0.1:${server.address.port}${base}`, stop: () => server.stop() };
}
