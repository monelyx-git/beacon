# Root redirect summary

## Done
- With no `content/index.md`, `/` now builds a redirect page to the first page in sidebar order (depth-first, first node with an `href`). It has meta refresh, canonical, `noindex` and a JS fallback, and it respects the `site` base path.
- The page is not in `sitemap.xml` and not in Pagefind (it has no `data-pagefind-body`). Tested: the index has 2 pages, not 3.
- `beacon build` and `beacon dev` print one info line naming the target. With `content/index.md` nothing changes.
- Owner decision: option (a), first page in sidebar order. No config field added.
- 96 tests pass, including new ones for nested first page, base path, a lone root index, attribute escaping (`/p&q`), dev rescan, and the CLI line.

## Measured (Pier build, unmodified docs)
- `scripts/accept-pier.sh` passes. `/` redirects to `/backups-and-restore/` (first alphabetically, because Pier has no `order`; not getting-started).
- `/install/`: JS 2.00 KB gz (< 30), CSS 2.57 KB gz (< 20), inline script 230 B. The redirect page ships no CSS or JS bundle.
- Lighthouse, median of 3: `/` and `/install/` both 100/100/100.
- `node scripts/e2e.mjs`: all checks passed.

## Open
- Pier lands on backups-and-restore. Pier can fix this by adding `index.md` or `order: 1` to getting-started.
- No custom `404.html` (out of scope); proposed separately if wanted.
