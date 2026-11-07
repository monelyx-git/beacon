/** Prefixes an internal path with the site base (e.g. "/docs"). */
export const withBase = (path) => import.meta.env.BASE_URL.replace(/\/$/, '') + path;

/** Returns the chain of nav nodes leading to `href`, or [] when absent. */
export function trail(nodes, href, path = []) {
  for (const n of nodes) {
    const here = [...path, n];
    if (n.href === href) return here;
    const found = trail(n.children, href, here);
    if (found.length) return found;
  }
  return [];
}
