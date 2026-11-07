# Reader features summary

## Done
- Copy page as Markdown: `beacon build` writes `<slug>.md` per page (`beacon dev` serves the same URLs); a "Copy page" button fetches it. It uses a `ClipboardItem` holding the pending fetch so Safari accepts the write.
- Hideable sidebar: button and `[` shortcut, remembered in `localStorage`, restored by the existing inline head script (no flash). Hidden with `visibility`, so links leave the tab order. No effect below 1024px.
- Optional `collapsibleSidebar` (`<details>`, open on the current branch, no JS) and `editUrl` (Edit this page link).
- Previous/next pager, `#` anchors on h2-h4 (excluded from search with `data-pagefind-ignore`), `llms.txt`.
- Motion: one `motion.css`, all inside `prefers-reduced-motion: no-preference`; a test fails if motion appears anywhere else.
- No new dependencies. 165 tests pass (127 before).

## Measured (components fixture, `/static/`)
- JS 2.41 KB gz (< 30; was about 2.0), CSS 3.29 KB gz (< 20; was about 2.6), inline script 317 B (< 1024).
- Search open: 35.35 KB gz (< 36; was about 34). Tabs page 11.93 KB.
- Soft target was at most +2 KB JS and +1.5 KB CSS: met (+0.4 KB JS, +0.7 KB CSS).
- Lighthouse, median of 3: `/static/` and `/tabs/` 100/100/100.
- `node scripts/e2e.mjs`: all checks passed, including new ones for copy page and the sidebar toggle (state survives a reload).

## Open
- Search open is now 0.65 KB under its 36 KB budget; the next feature that touches the shared page script will need a decision.
- Not checked: Safari clipboard behavior and the look of the sidebar toggle at narrow desktop widths (1025-1200px); both need a human in a real browser.
- Deferred by design: "last updated" dates (shallow CI clones give wrong dates) and a feedback widget (needs a backend).
