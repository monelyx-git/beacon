/** Top results for a query as plain objects; blank queries never touch the index. */
export async function runSearch(pagefind, query, limit = 8) {
  const q = query.trim();
  if (!q) return [];
  const { results } = await pagefind.search(q);
  return Promise.all(results.slice(0, limit).map(async (r) => {
    const d = await r.data();
    return { url: d.url, title: d.meta?.title ?? d.url, excerpt: d.excerpt };
  }));
}

let loading;
/** Loads Pagefind once, on first use, from the site's base path. `importer` exists so tests need no browser. */
export function loadPagefind(base, importer = (url) => import(/* @vite-ignore */ url)) {
  loading ??= importer(`${base}pagefind/pagefind.js`).then(async (pf) => {
    await pf.options({ baseUrl: base });
    return pf;
  });
  return loading;
}
