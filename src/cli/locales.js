import { buildNav } from './content.js';

/** @typedef {import('./content.js').Page} Page */
/** @typedef {import('./content.js').NavNode} NavNode */
/** @typedef {Page & {locale: string, rel: string}} LocPage */

const CODE = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/;
const path = (slug) => (slug ? `/${slug}/` : '/');

export function parseLocales(raw) {
  if (!Array.isArray(raw) || !raw.length) throw new Error('beacon.config: "locales" must be a non-empty array of language codes');
  for (const c of raw) {
    if (typeof c !== 'string' || !CODE.test(c)) throw new Error(`beacon.config: "locales" has an invalid code ${JSON.stringify(c)} (expected e.g. "en" or "pt-br")`);
  }
  const dup = raw.find((c, i) => raw.indexOf(c) !== i);
  if (dup) throw new Error(`beacon.config: "locales" lists "${dup}" more than once`);
  return raw;
}

export const prefix = (code, locales) => (code === locales[0] ? '' : `/${code}`);
export const homeHref = (code, locales) => `${prefix(code, locales)}/`;

/** @param {Page[]} pages @param {string[]} [locales] @returns {LocPage[]} */
export function assignLocales(pages, locales) {
  if (!locales) return pages.map((p) => ({ ...p, locale: 'en', rel: p.slug }));
  const [def, ...others] = locales;
  const out = pages.map((p) => {
    const [first, ...rest] = p.slug.split('/');
    if (first === def) throw new Error(`content/${def}/ holds "${p.slug}": "${def}" is the default language, so move content/${def}/ up one level into content/`);
    return others.includes(first) ? { ...p, locale: first, rel: rest.join('/') } : { ...p, locale: def, rel: p.slug };
  });
  for (const c of locales) {
    if (!out.some((p) => p.locale === c)) throw new Error(`locale "${c}" has no pages: add content for it or remove it from "locales"`);
  }
  return out;
}

/** @param {LocPage[]} pages @returns {NavNode[]} */
export function navFor(pages, code, locales) {
  const pre = prefix(code, locales);
  const nav = buildNav(pages.filter((p) => p.locale === code).map((p) => ({ ...p, slug: p.rel })));
  const fix = (n) => ({ ...n, ...(n.href ? { href: pre + n.href } : {}), children: n.children.map(fix) });
  return nav.map(fix);
}

export const counterpart = (pages, page, code) => pages.find((p) => p.locale === code && p.rel === page.rel);

export function switcherLinks(pages, page, locales) {
  return locales.map((code) => {
    const hit = page.rel === undefined ? undefined : code === page.locale ? page : counterpart(pages, page, code);
    return { code, href: hit ? path(hit.slug) : homeHref(code, locales), current: code === page.locale };
  });
}

export function alternates(pages, page, locales) {
  if (page.rel === undefined) return [];
  const found = locales.flatMap((code) => {
    const hit = code === page.locale ? page : counterpart(pages, page, code);
    return hit ? [{ hreflang: code, href: path(hit.slug) }] : [];
  });
  if (found.length < 2) return [];
  const def = found.find((a) => a.hreflang === locales[0]);
  return def ? [...found, { hreflang: 'x-default', href: def.href }] : found;
}

export function missingTranslations(pages, locales) {
  const out = {};
  for (const code of locales.slice(1)) {
    const miss = pages.filter((p) => p.locale === locales[0] && !counterpart(pages, p, code)).map((p) => p.rel);
    if (miss.length) out[code] = miss;
  }
  return out;
}
