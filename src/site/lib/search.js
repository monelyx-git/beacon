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

const loading = new Map();
/**
 * Loads Pagefind once per base path, on first use. A failed load is forgotten so the next query retries.
 * `importer` exists so tests need no browser.
 */
export function loadPagefind(base, importer = (url) => import(/* @vite-ignore */ url)) {
  if (!loading.has(base)) {
    const pending = importer(`${base}pagefind/pagefind.js`).then(async (pf) => {
      await pf.options({ baseUrl: base });
      return pf;
    });
    pending.catch(() => loading.delete(base));
    loading.set(base, pending);
  }
  return loading.get(base);
}
