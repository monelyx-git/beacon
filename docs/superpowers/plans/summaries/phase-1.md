# Phase 1 summary: smallest end-to-end slice

## Done
- Config loading and validation (`site` required, `accent` validated for contrast against both Pier backgrounds).
- Content scan, slugs, titles, ordering and sidebar tree from the folder structure.
- `beacon build [--root dir]`: bundled Astro project run programmatically, three-column layout, TOC, breadcrumb, vendored Pier tokens.
- ADRs 0001 (Astro), 0002 (`@astrojs/mdx`), 0003 (Lighthouse, devDependency).
- Budget script (`scripts/measure-budget.mjs`) and Lighthouse runner (`scripts/lighthouse.mjs`).
- 18 tests passing (`pnpm test`).

## Measured against budgets (fixture `test/fixtures/basic`, `/guide/intro/`)
| Metric | Result | Budget |
|---|---|---|
| JS, gzipped | 0.10 KB (inline theme script only, 102 B raw) | < 30 KB; inline < 1 KB |
| CSS, gzipped | 1.42 KB | < 20 KB |
| Lighthouse (perf / a11y / SEO) | 100 / 100 / 100 on `/`, `/guide/intro/`, `/guide/setup/` | 100 each |

One cold first run of `/` scored performance 82; two reruns scored 100. Single runs are noisy, so CI should use the median of three.

These numbers are for a tiny fixture with system fonts and no highlighting. They will grow in later phases, so do not read them as the final budget picture.

## Open
- Astro writes `.astro/` into the package root during a build. This may fail when the package is installed read-only; verify on a packed install (Task 6.2).
- Below 1024 px the sidebar is a static block above the content, with no collapsible menu yet.
- Pages without frontmatter have no meta description. A fallback is planned in Task 3.2, needed for Pier's docs to reach SEO 100.
- Fonts are system-only until Task 3.1. The theme script follows `prefers-color-scheme` only until Task 3.1.
