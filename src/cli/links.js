import { dirname, resolve } from 'node:path';

/**
 * Resolves a link found in `fromFile`. Relative links to .md/.mdx files become site paths;
 * links to docs that are not part of the content are reported as out of scope.
 * @returns {{href: string} | {outOfScope: true}}
 */
export function resolveLink(fromFile, href, pages) {
  if (/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(href)) return { href };
  const [, path, suffix = ''] = href.match(/^([^#?]*)([#?].*)?$/);
  if (!/\.mdx?$/.test(path)) return { href };
  const target = resolve(dirname(fromFile), path);
  const page = pages.find((p) => p.file === target);
  return page ? { href: (page.slug ? `/${page.slug}/` : '/') + suffix } : { outOfScope: true };
}

/**
 * Rewrites doc links in rendered page HTML and unwraps out-of-scope links to their text.
 * shortcut: regex over anchors, fine because the HTML comes from our own renderer and escapes
 * `<a` in code; upgrade to an HTML parser if odd markup appears.
 */
export function rewriteLinks(html, fromFile, pages, { base = '', warn = console.warn } = {}) {
  const prefix = base.replace(/\/$/, '');
  return html.replace(/<a\b([^>]*?)\bhref="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g, (match, pre, href, post, text) => {
    const r = resolveLink(fromFile, href, pages);
    if (r.outOfScope) {
      warn(`warn: ${fromFile}: link to ${href} is outside content, rendered as text`);
      return text;
    }
    return r.href === href ? match : `<a${pre}href="${prefix}${r.href}"${post}>${text}</a>`;
  });
}
