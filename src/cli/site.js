import { accessSync, constants, createReadStream } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import { loadConfig } from './config.js';
import { scanContent, buildNav } from './content.js';

const pkgRoot = fileURLToPath(new URL('../../', import.meta.url));
const VIRTUAL = 'virtual:beacon';
const RESOLVED = `\0${VIRTUAL}`;

/** Config, pages and nav for a project. Throws the user-facing config or content error. */
export async function loadSite(root) {
  const config = await loadConfig(root);
  const pages = await scanContent(join(root, 'content'));
  return { config, pages, nav: buildNav(pages) };
}

const moduleSource = ({ config, pages, nav }) => `
  export const config = ${JSON.stringify({ ...config, logo: config.logo ? `/${basename(config.logo)}` : undefined })};
  export const nav = ${JSON.stringify(nav)};
  export const pages = [${pages.map((p) => `{ ...${JSON.stringify({ slug: p.slug, file: p.file, title: p.title, description: p.description })}, load: () => import(${JSON.stringify(p.file)}) }`).join(',')}];
`;

/** Exposes config, pages and nav to the bundled site as one virtual module; in dev it rescans on content changes. */
function beaconModule(root, initial, { watch }) {
  let site = initial;
  return {
    name: 'beacon-module',
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : undefined),
    load: (id) => (id === RESOLVED ? moduleSource(site) : undefined),
    configureServer(server) {
      if (!watch) return;
      const dir = join(root, 'content');
      server.watcher.add(dir);
      const refresh = async (file) => {
        if (!file.startsWith(dir) || !/\.mdx?$/.test(file)) return;
        try { site = await loadSite(root); } catch (err) { server.config.logger.error(err.message); return; }
        for (const env of Object.values(server.environments)) {
          const mod = env.moduleGraph.getModuleById(RESOLVED);
          if (mod) env.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: 'full-reload' });
      };
      for (const event of ['add', 'unlink', 'change']) server.watcher.on(event, refresh);
      // The logo lives in the user's project; build copies it, dev serves it.
      if (site.config.logo) {
        const url = `/${basename(site.config.logo)}`;
        server.middlewares.use(url, (req, res) => sendFile(join(root, site.config.logo), res));
      }
    },
  };
}

const sendFile = (file, res) => createReadStream(file).on('error', () => { res.statusCode = 404; res.end(); }).pipe(res);

/** Astro inline config shared by `build` and `dev`. */
export function astroConfig(root, site, { watch = false } = {}) {
  // shortcut: Astro writes .astro/ into its root (the package folder) and cannot move it; supporting read-only
  // installs would mean copying the bundled site into the project cache on every build.
  try { accessSync(pkgRoot, constants.W_OK); } catch {
    throw new Error(`beacon: ${pkgRoot} is not writable. Astro writes generated files next to the bundled site, so install @monelyx/beacon where your user can write (for example as a devDependency of your project).`);
  }
  const siteUrl = new URL(site.config.site);
  const work = join(root, 'node_modules/.cache/beacon');
  return {
    root: pkgRoot,
    srcDir: join(pkgRoot, 'src/site'),
    publicDir: join(pkgRoot, 'src/site/public'),
    outDir: join(root, 'dist'),
    cacheDir: join(work, 'cache'),
    configFile: false,
    site: siteUrl.origin,
    base: siteUrl.pathname,
    logLevel: 'warn',
    // Without include/exclude the Preact transform skips files under node_modules, i.e. every installed copy of Beacon.
    integrations: [mdx(), preact({ include: [join(pkgRoot, 'src/site/**/*.jsx')], exclude: [] })],
    vite: { plugins: [beaconModule(root, site, { watch })], logLevel: 'warn' },
  };
}
