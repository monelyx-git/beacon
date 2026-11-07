# Phase 5 summary: search

## Done
- Pagefind (ADR 0008, approved by the owner) indexes page bodies after the build; copy buttons and the sidebar are excluded from the index.
- Our own search dialog (Preact), opened with ⌘K / Ctrl+K or the sidebar button. Its code, Pagefind and the index load only on first open; a plain page contains no reference to any of them.
- Path-prefixed sites are handled: result URLs are prefixed through Pagefind's `baseUrl`.
- 67 tests passing.

## Verified in a real browser (headless Chrome, Pier's five docs)
- Pagefind is not loaded before search is opened.
- ⌘K opens the dialog with the input focused. Searching "backup" returns 3 results with "Backups and restore" first, and excerpts with the match highlighted.
- Escape closes it and ⌘K reopens it. No JS errors.

## Measured against budgets
| State | JS gz | Budget |
|---|---|---|
| Plain page, no interaction | 2.00 KB (script) / 1.5 KB (browser) | < 30 KB |
| Page with tabs | 10.97 KB | < 30 KB |
| **Search open** | **34.10 KB** (browser: 34.4 KB) | **36 KB (raised, see below)** |
| CSS | 2.57 KB | < 20 KB |
| Lighthouse | 100 / 100 / 100 on all five Pier pages | 100 |

Lazy search data, reported separately: Pagefind WASM about 58 KB (raw), index about 36 KB for these five pages.

## The budget I raised
With search open the page loads 34.1 KB gzipped JS, over the 30 KB figure. Cause: Pagefind's own runtime (`pagefind.js` 13.4 KB + worker 12.4 KB = 25.8 KB, 75% of the total). Our search UI is 7.0 KB and the page 1.5 KB.

You allowed raising the budget where needed, so I added a **separate search-open budget of 36 KB** and left the reading-page budget at 30 KB. It is enforced by `scripts/measure-budget.mjs --search-open` and a test. Headroom is 1.9 KB.

Alternative that avoids the increase: write the search dialog in vanilla JS instead of Preact (about 7 KB less, about 27 KB total). I kept Preact because the spec and ADR 0006 name the search UI as an island. Say if you would rather have the stricter budget.

## Bugs found by testing in a real browser
- After closing the dialog, pressing ⌘K again did nothing, because the dialog was unmounted on close and never remounted correctly. It is now mounted once and opened with `showModal()`. I did not find out why the unmount failed after a native Escape close; I removed the dependency on it.
- My budget script did not follow the minifier's backtick import specifiers, so search-open read 27.2 KB instead of 34.4 KB. My own guard test had the same blind spot and passed vacuously. Both are fixed, and the test now uses the real emitted form.

## Open
- The end-to-end checks (tabs, copy, toggle, search open/close/reopen) are throwaway scripts outside the repo. I plan to turn them into `scripts/e2e.mjs` in Task 6.2 so CI can run them.
- Site root `/` has no page when the content has no root `index.md`; proposal: redirect to the first page. Needs your call.
- Astro writes `.astro/` into the package root during a build; verify on a packed install (Task 6.2).
