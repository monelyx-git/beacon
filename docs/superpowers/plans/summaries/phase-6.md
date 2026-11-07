# Phase 6 summary, and v1 summary

## Done
- `beacon dev [--root] [--port]`: live reload, content and navigation rescanned on change, logo and content files served; `build` and `dev` share `src/cli/site.js`.
- Packaging verified by installing the packed tarball with npm into a clean project. That found two real defects, both fixed or turned into a clear message (below).
- `scripts/e2e.mjs`: 16 real-browser checks over the DevTools protocol (tabs, copy, theme toggle, search open/close/reopen, hostile content). `scripts/lighthouse.mjs` reports the median of 3 runs. CI workflow and README written.
- Independent whole-branch review: 0 Critical, 7 Important, all fixed test-first; 9 Minor deferred (listed in the final message).
- 88 unit and build tests passing.

## v1 acceptance: Pier's five docs build unmodified
`scripts/accept-pier.sh` copies `getting-started`, `install`, `backups-and-restore`, `notifications` and `monorepos` from `../pier-by-monelyx/docs/` without editing them: 5 pages, exit 0. The only build output is two warnings for links to docs outside scope (`troubleshooting.md`, `adr/0034-...`), rendered as plain text as agreed.

## Final measurements (Pier build)
| Metric | Result | Budget |
|---|---|---|
| Reading page JS, gzipped | 2.00 KB | < 30 KB |
| Reading page CSS, gzipped | 2.57 KB | < 20 KB |
| Inline theme script | 230 B | < 1 KB |
| Page with tabs, JS | 11.5 KB | < 30 KB |
| Search open (page without tabs), JS | 34.2 KB | < 36 KB (separate budget, raised) |
| Search open on a page with tabs, JS | 40.6 KB | not budgeted |
| Lighthouse perf / a11y / SEO | 100 / 100 / 100, median of 3, all 15 runs on all 5 pages | 100 |
| Lazy search data (raw) | WASM 116 KB, index 36 KB for these pages | reported only |
| Install size (npm, clean project) | 182 MB | accepted by the design |

## Defects found by installing the package and by using a real browser
- The packed package did not build: the Preact JSX transform skips `node_modules`, so islands were compiled for React. Fixed; regression tests simulate an installed layout.
- A read-only install failed with a bare `EACCES`: Astro writes `.astro/` into its root and cannot move it. v1 supports writable installs and now says so clearly.
- Search: one Escape cleared the text instead of closing the dialog; a second ⌘K did nothing after closing; a failed Pagefind load was cached forever. All fixed.
- Dev edits were ignored when the project path went through a symlink (macOS `/var`). Fixed.
- The test script ran built `dist/` JavaScript as tests, and the Astro cache was shared between projects. Both fixed.
- My budget script undercounted island JS twice (attribute-loaded islands, then backtick import specifiers). Fixed with tests that use the real emitted form.

## Open
- **Site root `/`**: with no root `index.md` (Pier's case) `/` has no page. Proposal: redirect to the first page. Your call.
- **Read-only installs** are unsupported. Follow-up: copy the bundled site into the project cache and symlink its dependencies on every build.
- **One unexplained flake** in about 21 browser runs ("Search is unavailable"). Its error was swallowed before logging existed; 18+ clean runs since, and a real defect in the same code (cached rejection) was fixed.
- **CI not run on GitHub**; its steps were run locally and pass. **Windows is untested.**
- `package.json` stays `private: true` with `UNLICENSED`; flip both and publish when you decide. Nothing was published, merged or pushed.
- Copy button and theme toggle are vanilla JS, not islands as the spec lists them (they appear on nearly every page); flagged for your review.
