import * as pagefind from 'pagefind';

/** Indexes the built site (page bodies only) into <outDir>/pagefind. */
export async function buildSearchIndex(outDir) {
  const { index, errors } = await pagefind.createIndex({});
  try {
    if (errors.length || !index) throw new Error(`search index: ${errors.join('; ')}`);
    const added = await index.addDirectory({ path: outDir });
    if (added.errors.length) throw new Error(`search index: ${added.errors.join('; ')}`);
    const written = await index.writeFiles({ outputPath: `${outDir}/pagefind` });
    if (written.errors.length) throw new Error(`search index: ${written.errors.join('; ')}`);
  } finally {
    await pagefind.close();
  }
}
