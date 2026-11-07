import { rm } from 'node:fs/promises';
import * as pagefind from 'pagefind';

// Pagefind writes its own UIs next to the runtime. We use our own dialog, so they would only add dead weight to a deploy.
const UNUSED = ['pagefind-ui.js', 'pagefind-ui.css', 'pagefind-modular-ui.js', 'pagefind-modular-ui.css', 'pagefind-component-ui.js', 'pagefind-component-ui.css', 'pagefind-highlight.js'];

/** Indexes the built site (page bodies only) into <outDir>/pagefind. */
export async function buildSearchIndex(outDir) {
  const { index, errors } = await pagefind.createIndex({});
  try {
    if (errors.length || !index) throw new Error(`search index: ${errors.join('; ')}`);
    const added = await index.addDirectory({ path: outDir });
    if (added.errors.length) throw new Error(`search index: ${added.errors.join('; ')}`);
    const written = await index.writeFiles({ outputPath: `${outDir}/pagefind` });
    if (written.errors.length) throw new Error(`search index: ${written.errors.join('; ')}`);
    await Promise.all(UNUSED.map((f) => rm(`${outDir}/pagefind/${f}`, { force: true })));
  } finally {
    await pagefind.close();
  }
}
