import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNav, rootRedirect } from '../src/cli/content.js';
import {
  parseLocales, prefix, homeHref, assignLocales, navFor, counterpart, switcherLinks, alternates, missingTranslations,
} from '../src/cli/locales.js';

const L = ['en', 'es'];
const pg = (slug, extra = {}) => ({
  slug, file: `/c/${slug ? `${slug}.md` : 'index.md'}`, title: slug || 'Home', ...extra,
});
const idx = (slug, extra = {}) => ({ slug, file: `/c/${slug}/index.md`, title: slug, ...extra });
const sample = () => assignLocales([
  pg('', { title: 'Home' }), pg('guide/intro', { title: 'Intro', order: 1 }), pg('only-en', { title: 'Only' }),
  pg('es', { title: 'Inicio', file: '/c/es/index.md' }), pg('es/guide/intro', { title: 'Introduccion', order: 5 }),
  pg('es/solo', { title: 'Solo es' }),
], L);

test('parseLocales validates', () => {
  assert.deepEqual(parseLocales(['en', 'es', 'pt-br']), ['en', 'es', 'pt-br']);
  for (const bad of [[], 'en', ['EN'], ['en', 'en'], ['english']]) {
    assert.throws(() => parseLocales(bad), /beacon\.config: "locales"/);
  }
});

test('prefix and homeHref', () => {
  assert.equal(prefix('en', L), '');
  assert.equal(prefix('es', L), '/es');
  assert.equal(homeHref('en', L), '/');
  assert.equal(homeHref('es', L), '/es/');
});

test('assignLocales', () => {
  const one = assignLocales([pg('a/b')]);
  assert.deepEqual([one[0].locale, one[0].rel], ['en', 'a/b']);
  const p = sample();
  const intro = p.find((x) => x.slug === 'es/guide/intro');
  assert.deepEqual([intro.locale, intro.rel], ['es', 'guide/intro']);
  assert.deepEqual([p[0].locale, p[0].rel], ['en', '']);
  const root = p.find((x) => x.slug === 'es');
  assert.deepEqual([root.locale, root.rel], ['es', '']);
  assert.throws(() => assignLocales([pg('en/x')], L), /content\/en\/.*one level/);
  assert.throws(() => assignLocales([pg('a')], ['en', 'fr']), /fr/);
});

test('navFor prefixes hrefs and uses own pages and order', () => {
  const p = sample();
  const nav = navFor(p, 'es', L);
  assert.equal(nav[0].href, '/es/');
  assert.match(JSON.stringify(nav), /"\/es\/guide\/intro\/"/);
  assert.ok(!nav.some((n) => n.label === 'Es'));
  const guide = nav.find((n) => n.label === 'Guide');
  assert.equal(guide.children[0].order, 5);
  assert.equal(navFor(p, 'en', L)[0].href, '/');
});

test('navFor handles nested index pages', () => {
  const p = assignLocales([pg('', { title: 'Home' }), idx('es/guide', { title: 'Guia' }), pg('es/guide/x'), pg('es', { file: '/c/es/index.md' })], L);
  const nav = navFor(p, 'es', L);
  assert.equal(nav[0].href, '/es/');
  const guide = nav.find((n) => n.href === '/es/guide/');
  assert.equal(guide.children[0].href, '/es/guide/x/');
});

test('counterpart ignores order and title', () => {
  const p = sample();
  const en = p.find((x) => x.slug === 'guide/intro');
  assert.equal(counterpart(p, en, 'es').slug, 'es/guide/intro');
  assert.equal(counterpart(p, p.find((x) => x.slug === 'only-en'), 'es'), undefined);
});

test('switcherLinks', () => {
  const p = sample();
  const solo = p.find((x) => x.slug === 'es/solo');
  assert.deepEqual(switcherLinks(p, solo, L), [
    { code: 'en', href: '/', current: false }, { code: 'es', href: '/es/solo/', current: true },
  ]);
  const en = p.find((x) => x.slug === 'guide/intro');
  assert.equal(switcherLinks(p, en, L)[1].href, '/es/guide/intro/');
  assert.deepEqual(switcherLinks(p, { slug: '404', title: '404', file: 'x', locale: 'en' }, L).map((l) => l.href), ['/', '/es/']);
});

test('alternates', () => {
  const p = sample();
  assert.deepEqual(alternates(p, p.find((x) => x.slug === 'only-en'), L), []);
  assert.deepEqual(alternates(p, p.find((x) => x.slug === 'guide/intro'), L), [
    { hreflang: 'en', href: '/guide/intro/' }, { hreflang: 'es', href: '/es/guide/intro/' },
    { hreflang: 'x-default', href: '/guide/intro/' },
  ]);
});

test('missingTranslations', () => {
  assert.deepEqual(missingTranslations(sample(), L), { es: ['only-en'] });
});

test('rootRedirect with a home', () => {
  const p = sample();
  assert.equal(rootRedirect(navFor(p, 'es', L), '/es/'), null);
  assert.equal(rootRedirect(buildNav([idx('guide')]), '/es/'), '/guide/');
  assert.equal(rootRedirect(buildNav([pg('')])), null);
});
