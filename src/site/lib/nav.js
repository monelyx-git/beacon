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

/** Previous and next linked nodes in sidebar order (depth-first), or {} when `href` is not in the nav. */
export function siblings(nodes, href) {
  const flat = [];
  const walk = (list) => list.forEach((n) => { if (n.href) flat.push(n); walk(n.children); });
  walk(nodes);
  const i = flat.findIndex((n) => n.href === href);
  return i < 0 ? {} : { prev: flat[i - 1], next: flat[i + 1] };
}
