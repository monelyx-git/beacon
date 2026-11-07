import { dirname, relative, resolve, sep } from 'node:path';

const RELATIVE = (href) => !/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(href);
const safeDecode = (s) => { try { return decodeURI(s); } catch { return null; } };

/**
 * Resolves a link found in `fromFile`. Relative links to .md/.mdx files become site paths;
 * links to docs that are not part of the content are reported as out of scope.
 * @returns {{href: string} | {outOfScope: true}}
 */
export function resolveLink(fromFile, href, pages) {
  if (/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(href)) return { href };
  const [, path, suffix = ''] = href.match(/^([^#?]*)([#?].*)?$/);
  if (!/\.mdx?$/.test(path)) return { href };
  const decoded = safeDecode(path);
  const target = decoded === null ? null : resolve(dirname(fromFile), decoded);
  const page = target && pages.find((p) => p.file === target);
  return page ? { href: (page.slug ? `/${page.slug}/` : '/') + suffix } : { outOfScope: true };
}

/** Site path of a copied asset (image, PDF, ...) that a relative href points at, or null. */
function assetHref(fromFile, href, { assets, contentDir, prefix }) {
  if (!RELATIVE(href)) return null;
  const [, path, suffix = ''] = href.match(/^([^#?]*)([#?].*)?$/);
  const decoded = safeDecode(path);
  const abs = decoded === null ? null : resolve(dirname(fromFile), decoded);
  if (!abs || !assets.has(abs)) return null;
  return `${prefix}/${relative(contentDir, abs).split(sep).map(encodeURIComponent).join('/')}${suffix}`;
}

/**
 * Rewrites doc links and relative images/files in rendered page HTML; out-of-scope doc links become their text.
 * shortcut: regex over anchors and images, fine because the HTML comes from our own renderer and escapes
 * `<a` in code; upgrade to an HTML parser if odd markup appears.
 */
export function rewriteLinks(html, fromFile, pages, { base = '', warn = console.warn, assets = new Set(), contentDir = '' } = {}) {
  const ctx = { assets, contentDir, prefix: base.replace(/\/$/, '') };
  const images = html.replace(/<img\b([^>]*?)\bsrc="([^"]*)"([^>]*)>/g, (match, pre, src, post) => {
    const asset = assetHref(fromFile, src, ctx);
    if (asset) return `<img${pre}src="${asset}"${post}>`;
    if (RELATIVE(src)) warn(`warn: ${fromFile}: image ${src} was not found in content`);
    return match;
  });
  return images.replace(/<a\b([^>]*?)\bhref="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g, (match, pre, href, post, text) => {
    const asset = assetHref(fromFile, href, ctx);
    if (asset) return `<a${pre}href="${asset}"${post}>${text}</a>`;
    const r = resolveLink(fromFile, href, pages);
    if (r.outOfScope) {
      warn(`warn: ${fromFile}: link to ${href} is outside content, rendered as text`);
      return text;
    }
    return r.href === href ? match : `<a${pre}href="${ctx.prefix}${r.href}"${post}>${text}</a>`;
  });
}
