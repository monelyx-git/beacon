# Phase 3 summary: theme, fonts, SEO

## Done
- Self-hosted Bricolage Grotesque via Fontsource (ADR 0005), Latin subset preloaded, `font-display: swap`, no Google Fonts.
- No-flash theme script: stored choice (`beacon-theme`) wins, otherwise `prefers-color-scheme`; survives blocked storage and junk values. 230 B inline.
- SEO: title, description, canonical, Open Graph, Twitter card on every page; `sitemap.xml`, `robots.txt`, one default `og.png`.
- Pages without a frontmatter description get the first prose paragraph (max 160 chars), then the site title.
- Path-prefixed sites (`https://x.dev/docs`) keep nav links, rewritten doc links, canonical and sitemap under the prefix. This was untested before and is now covered.
- 41 tests passing.

## Measured against budgets (Pier build)
| Metric | Result | Budget |
|---|---|---|
| JS, gzipped | 0.18 KB (inline theme script, 230 B raw) | < 30 KB; inline < 1 KB |
| CSS, gzipped | 1.86 KB (includes `@font-face`) | < 20 KB |
| Font on the critical path | 41 KB woff2 (Latin), reported separately | n/a |
| Lighthouse perf / a11y / SEO | 100 / 100 / 100 on all five Pier pages | 100 each |

## Decisions to know about
- The theme toggle button is not in this phase. A button needs a React island, so it lands in Task 4.2. Until then the theme follows the stored value or the system.
- The OG image is a generated plain card (accent bar on Pier's sidebar color), with no text. Text on the image would need a font or image dependency. A custom image option is out of v1.
- `engines.node` is now `>=22.2` because the PNG encoder uses `zlib.crc32`. The spec says `>=22`; this is a narrowing, not a contradiction.

## Open
- Site root `/` has no page when the content has no root `index.md` (Pier's docs have none). Proposed: redirect `/` to the first page. Not built; needs your call.
- Astro writes `.astro/` into the package root during a build; verify on a packed install (Task 6.2).
- CI should use the median of three Lighthouse runs.
