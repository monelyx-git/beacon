# Phase 4 summary: components and islands

## Done
- `Callout` and `Steps` (static, no JS) and `Tabs`/`Tab`, all available in MDX without imports. TOC scroll-spy in vanilla JS.
- `Tabs` is a Preact island: panels render as static HTML (all visible without JS); the island builds the tab list, hides inactive panels, and supports arrow/Home/End keys with `aria-selected` and `tabpanel` roles.
- Copy button on highlighted code blocks and a theme toggle (stored under `beacon-theme`), both small vanilla scripts.
- ADR 0006 (Preact, supersedes the React row of the design) and ADR 0007 (`@astrojs/preact`). Approved by the owner on option A.
- 59 tests passing.

## Measured against budgets
| Page | JS gz | CSS gz | Inline theme script | Lighthouse |
|---|---|---|---|---|
| Pier docs page (no tabs) | 0.85 KB | 2.35 KB | 230 B | 100 / 100 / 100 on all 5 pages |
| Page with tabs and code | 10.97 KB | 2.41 KB | 230 B | 100 / 100 / 100 |
| Budget | < 30 KB | < 20 KB | < 1 KB | 100 |

React was measured first and rejected: one trivial island shipped 70.13 KB gz (react-dom client 65.7 KB). Preact brings the same island to about 11 KB (preact 4.6 KB, signals 3.0 KB, hooks 1.3 KB, client 1.6 KB, island 0.9 KB). **No budget was raised**, although the owner allowed it.

## Verified in a real browser
Headless Chrome over the DevTools protocol (throwaway script, not in the repo): tabs hydrate, click and ArrowLeft switch panels, the copy button puts the code on the clipboard and resets, the toggle flips and stores the theme, no JS errors. This also confirms that rendering the page slot to a string (Task 2.2) does not break islands.

## Decisions to know about
- **Copy button and theme toggle are vanilla, not islands.** They appear on nearly every page, and a framework there would cost every reader. The spec lists them as islands, so this is a deviation to review.
- **Tabs use an Astro wrapper** because Astro requires an explicit import for any MDX tag carrying a `client:` directive. Authors still write `<Tabs>` and `<Tab label="...">` with no imports.
- **No React packages at all.** An alias to `preact/compat` would have needed `react` and `react-dom` installed anyway.

## Fixed along the way
- **Measurement.** The budget script undercounted island JS (2.6 KB reported for a 70 KB page) and applied the 1 KB inline budget to every inline script; it now means the theme script only.
- **Flaky builds.** The Astro cache was shared across all projects in the OS temp dir; it is now per project, with a test.
- **Phantom tests.** `node --test` ran built `dist/` JavaScript as tests; the test script now only runs `test/*.test.js`.

## Open
- Site root `/` has no page when the content has no root `index.md`; proposal: redirect to the first page. Needs your call.
- Astro writes `.astro/` into the package root during a build; verify on a packed install (Task 6.2).
- Step badges use `--primary-foreground` text on the accent; custom accents are validated against page backgrounds only. To review in the final pass.
- CI should use the median of three Lighthouse runs.
