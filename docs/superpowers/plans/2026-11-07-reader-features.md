# Beacon Reader Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pages get a copy-as-Markdown button, a hideable sidebar, optional collapsible groups, minimal motion, previous/next links, heading anchors and an optional edit link; the build also publishes `<slug>.md` files and `llms.txt`.

**Architecture:** Almost everything is build-time HTML plus CSS. Pure helpers go in small modules (`nav.js`, `anchors.js`, `edit-link.js`, `llms.js`, `sidebar-toggle.js`) and are unit tested; the layout wires them. Runtime JS is limited to two more handlers in the existing delegated page script and two lines in the inline head script. One shared build fixture (`test/fixtures/reader/`) serves the integration tests.

**Tech Stack:** Node >= 22.2 ESM (`.js`), Astro 7, Preact (untouched), Pagefind, `node --test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-07-reader-features-design.md`

## Global Constraints

- Everything in English (code, comments, identifiers, logs, errors, UI copy, tests, commits); the only non-English text is the `es` dictionary.
- No new dependencies. If one seems needed, stop and raise it (needs an ADR).
- One commit per task, Conventional Commits, **no `Co-Authored-By` or other attribution trailers** (AGENTS.md rule 10; it overrides any default attribution).
- Existing tests pass untouched. A failing one is a regression to fix in the code, never a test to loosen.
- New config fields are optional; with both unset the only HTML changes are the additive chrome (toggle, copy button, pager, anchors).
- Budgets (gzipped, `scripts/measure-budget.mjs`): JS < 30 KB, CSS < 20 KB, inline theme script < 1 KB (`1024` bytes, raw). Soft target: at most +2 KB JS and +1.5 KB CSS on a plain page versus today (about 2 KB JS, 2.6 KB CSS). A missed budget is documented with options, never relaxed (AGENTS.md rule 9).
- Chrome strings live in `src/site/lib/strings.js` in both `en` and `es` (a test requires equal keys). New keys: `copyPage: 'Copy page'`, `toggleSidebar: 'Toggle sidebar'`, `previous: 'Previous'`, `next: 'Next'`, `pager: 'Previous and next page'`, `editPage: 'Edit this page'`, `anchor: 'Link to this section'`. Spanish: `'Copiar página'`, `'Mostrar u ocultar la barra lateral'`, `'Anterior'`, `'Siguiente'`, `'Página anterior y siguiente'`, `'Editar esta página'`, `'Enlace a esta sección'`. Add each key in the task that first uses it.
- New interactive chrome carries `data-pagefind-ignore` when it sits inside `<main data-pagefind-body>`.
- CSS custom properties you add use the `--bx-` prefix (`test/css.test.js` forbids shadowing Pier tokens).
- Lighthouse accessibility must stay 100 (visible focus, labels, contrast).

## Review Focus

1. Blocked or throwing `localStorage` (private mode): the sidebar toggle still works for the page, nothing throws. [Task 1]
2. A hidden sidebar's links are not reachable with Tab, and `[` is ignored while typing in the search input or any text field. [Task 1]
3. Pager on the first page (no previous), the last page (no next), a one-page site (no pager at all) and a page that is not in the nav, like 404. [Task 3]
4. Copy page: the `.md` request fails (404/offline) and the button says "Copy failed" without throwing; a page that already has its own `# ` heading is not given a second one. [Tasks 6, 7]
5. Heading anchors never leak `#` into search results or the TOC, and a code block that shows `<h2 id="x">` as text is untouched. [Task 4]

---

### Task 1: Hide and show the sidebar

**Files:**
- Create: `src/site/lib/sidebar-toggle.js`, `test/sidebar-toggle.test.js`, `test/reader.test.js`, `test/fixtures/reader/beacon.config.json`, `test/fixtures/reader/content/index.md`, `test/fixtures/reader/content/guide/intro.md`, `test/fixtures/reader/content/guide/setup.mdx`, `test/fixtures/reader/content/guide/advanced/tuning.md`, `test/fixtures/reader/content/own-h1.md`
- Modify: `src/site/lib/theme-script.js`, `src/site/layouts/Docs.astro`, `src/site/styles/layout.css`, `src/site/lib/strings.js`, `test/theme.test.js` (add one assertion, do not change existing ones)

**Interfaces:**
- Produces from `theme-script.js`: `SIDEBAR_KEY = 'beacon-sidebar'`; `themeScript` also adds class `sidebar-hidden` to `<html>` when storage holds `hidden` (same `try`, before first paint, total raw length < 1024).
- Produces from `sidebar-toggle.js`: `toggleSidebar(doc: Document, storage: {setItem}): boolean` (flips `sidebar-hidden` on `doc.documentElement`, stores `'hidden'`/`'visible'` under `SIDEBAR_KEY` in a `try`, returns true when now hidden, also sets `aria-expanded` on `.sidebar-toggle` when present); `isSidebarShortcut(e: {key: string, metaKey?: boolean, ctrlKey?: boolean, altKey?: boolean, target?: {closest?: (s: string) => unknown}}): boolean` (true for plain `[` when the target is not inside `input, textarea, select, [contenteditable]`).
- Fixture config: `{"site":"https://docs.example.com","title":"Reader","collapsibleSidebar":true,"editUrl":"https://github.com/acme/docs/edit/main/docs"}`. Content: `index.md` (title Home, order 1), `guide/intro.md` (Introduction, order 1, has `## Why` and a ```` ```sh ```` block), `guide/setup.mdx` (Setup, order 2, has `import X from './x'` free text inside a fenced block only), `guide/advanced/tuning.md` (Tuning; no index, so `advanced` is a group), `own-h1.md` (body starts `# My own heading`, no frontmatter title). Later tasks reuse this fixture.

- [ ] **Step 1: Write failing unit tests** in `test/sidebar-toggle.test.js`: `toggleSidebar flips the class and stores the choice` (fake doc with a `classList` and `documentElement`, fake storage; first call returns `true` and stores `hidden`, second returns `false` and stores `visible`); `toggleSidebar survives blocked storage` (storage throws; still returns the new state, no throw); `isSidebarShortcut` is true for `{key:'['}`, false for `{key:'[', metaKey:true}`, false with `target.closest` returning truthy, false for `{key:']'}`. In `test/theme.test.js` add `themeScript is under 1 KB and mentions the sidebar key`: `themeScript.length < 1024` and it contains `beacon-sidebar`.
- [ ] **Step 2: Run** `node --test test/sidebar-toggle.test.js test/theme.test.js`. Expected: FAIL (module missing / assertion).
- [ ] **Step 3: Implement** `sidebar-toggle.js` and extend `themeScript` as specified above. Run the same command. Expected: PASS.
- [ ] **Step 4: Write the failing build test** in `test/reader.test.js` (builds `test/fixtures/reader` once in `before`, removes `dist` in `after`, same pattern as `test/i18n.test.js`): `pages ship a sidebar toggle wired to the sidebar` asserts `guide/intro/index.html` matches `/<button[^>]*class="sidebar-toggle"[^>]*aria-controls="sidebar"[^>]*aria-expanded="true"/` and `/<aside[^>]*id="sidebar"/`.
- [ ] **Step 5: Implement the wiring.** In `Docs.astro`: give the `<aside>` `id="sidebar"`, add `<button type="button" class="sidebar-toggle" aria-controls="sidebar" aria-expanded="true" aria-label={s.toggleSidebar}>` with a plain glyph (no icon library) before `.shell`'s children, and in the page script handle the click (`toggleSidebar(document, storage)`) and a `keydown` listener using `isSidebarShortcut`. Add the string to both dictionaries. CSS in `layout.css`: `html.sidebar-hidden .shell { grid-template-columns: 0 minmax(0, 1fr) 14rem; }` and `html.sidebar-hidden .sidebar { visibility: hidden; overflow: hidden; }` (visibility, not `display:none`, so Task 9 can animate it); `.sidebar-toggle` is `position: fixed`, top-left, beside the sidebar edge when open (`left: 17.5rem`) and at `left: .75rem` when `.sidebar-hidden`; inside the existing `@media (max-width: 1024px)` block add `.sidebar-toggle { display: none; }` and `html.sidebar-hidden .sidebar { visibility: visible; }`. `aria-expanded` is set on first load from the class as well (the inline script runs before the button exists, so the page script syncs it once).
- [ ] **Step 6: Run** `node --test test/reader.test.js test/sidebar-toggle.test.js test/theme.test.js test/strings.test.js`. Expected: PASS. Then open `beacon dev` on the fixture in a browser, toggle with the button and `[`, reload (state kept), Tab through the page with the sidebar hidden (focus skips it), narrow the window below 1024px (toggle gone, sidebar visible).
- [ ] **Step 7: Commit** `feat: hide and show the sidebar`

### Task 2: Optional collapsible sidebar groups

**Files:**
- Modify: `src/cli/config.js`, `src/site/components/Sidebar.astro`, `src/site/layouts/Docs.astro`, `src/site/styles/layout.css`, `test/config.test.js`, `test/reader.test.js`

**Interfaces:**
- Consumes: `trail(nodes: NavNode[], href: string): NavNode[]` from `src/site/lib/nav.js`.
- Produces: `loadConfig` returns `collapsibleSidebar: true` only when the config says `true`; the field is absent otherwise. A non-boolean throws `beacon.config: "collapsibleSidebar" must be true or false`. `Sidebar.astro` gains an optional `collapsible` prop (default false).

- [ ] **Step 1: Write failing tests.** In `test/config.test.js`: `collapsibleSidebar true is returned, absent by default` and `collapsibleSidebar rejects non-booleans` (`'yes'` throws the message above). In `test/reader.test.js`: `collapsible groups open on the branch holding the current page` asserts that in `guide/advanced/tuning/index.html` the sidebar contains `<details open` wrapping the `Guide`/`Advanced` branch and that in `index.html` no `<details` in the sidebar is `open`; and that with the config field absent (build `test/fixtures/basic`, already built in other tests, so read its `dist/guide/intro/index.html` after building it in this test's own `before`) the sidebar contains no `<details`.
- [ ] **Step 2: Run** `node --test test/config.test.js test/reader.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** Config parsing next to `locales`. In `Sidebar.astro`, when `collapsible` and the node has children, render `<details open={trail([n], current).length > 0}><summary>{label link or span}</summary>{children}</details>`; otherwise render exactly today's markup. Pass `collapsible={config.collapsibleSidebar}` from `Docs.astro`. CSS: hide the native marker, draw a small chevron with a pseudo-element, keep the existing `.group` style. Pick the glyph yourself.
- [ ] **Step 4: Run** the same command plus `node --test test/build.test.js test/i18n.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add collapsibleSidebar option`

### Task 3: Previous and next links

**Files:**
- Modify: `src/site/lib/nav.js`, `src/site/layouts/Docs.astro`, `src/site/styles/layout.css`, `src/site/lib/strings.js`, `test/reader.test.js`
- Create: `test/nav.test.js`

**Interfaces:**
- Produces: `siblings(nodes: NavNode[], href: string): {prev?: NavNode, next?: NavNode}` in `nav.js`. Order is depth-first over nodes that have an `href`, which is the sidebar's visual order. Returns `{}` when `href` is not in the nav.

- [ ] **Step 1: Write failing tests** in `test/nav.test.js`: `siblings walks the sidebar order depth-first` (nav of `Home`, a folder `guide` with index and two children; middle page has both, first has only `next`, last has only `prev`); `siblings is empty for an href that is not in the nav and for a one-page nav`. In `test/reader.test.js`: `pages end with a pager in the page language` asserts `guide/intro/index.html` has `<nav class="pager" aria-label="Previous and next page"` with `href="/guide/setup/"` and `data-pagefind-ignore`, `index.html` has no `Previous` link, and `404.html` has no `class="pager"`.
- [ ] **Step 2: Run** `node --test test/nav.test.js test/reader.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `siblings`, add the three strings (`previous`, `next`, `pager`), render the `<nav class="pager">` at the end of `<main>` only when at least one side exists, using the locale's nav (`navs[locale]`) and `withBase` on hrefs. Style as two quiet links, previous left, next right, wrapping on narrow screens.
- [ ] **Step 4: Run** the same command plus `node --test test/strings.test.js test/i18n.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add previous and next page links`

### Task 4: Heading anchor links

**Files:**
- Create: `src/site/lib/anchors.js`, `test/anchors.test.js`
- Modify: `src/site/layouts/Docs.astro`, `src/site/styles/layout.css`, `src/site/lib/strings.js`, `test/reader.test.js`

**Interfaces:**
- Produces: `anchorHeadings(html: string, label: string): string`. For every `<h2>`-`<h4>` that has an `id`, appends `<a class="anchor" href="#<id>" aria-label="<label>" data-pagefind-ignore>#</a>` inside the heading. Headings without an `id` and non-heading markup are untouched.

- [ ] **Step 1: Write failing tests** in `test/anchors.test.js`: `adds an anchor to h2-h4 with an id` (`<h2 id="why">Why</h2>` becomes `<h2 id="why">Why<a class="anchor" href="#why" aria-label="Link to this section" data-pagefind-ignore>#</a></h2>`); `leaves h1, h5 and id-less headings alone`; `leaves escaped heading text inside code alone` (input `<pre><code>&lt;h2 id="x"&gt;</code></pre>` is returned unchanged); `keeps heading attributes and inner markup` (`<h3 id="a" class="k">A <code>b</code></h3>`). In `test/reader.test.js`: `anchors do not enter the search text or the TOC` asserts the `Why` TOC link text in `guide/intro/index.html` is exactly `Why` and the heading's anchor carries `data-pagefind-ignore`.
- [ ] **Step 2: Run** `node --test test/anchors.test.js test/reader.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `anchorHeadings`, apply it in `Docs.astro` right after `wrapCodeBlocks`, add the `anchor` string, CSS: `.anchor` is muted, `opacity: 0` by default and `opacity: 1` on heading `:hover` and on `.anchor:focus-visible` (it must stay keyboard reachable), with `margin-left: .4em` and `text-decoration: none`.
- [ ] **Step 4: Run** the same command plus `node --test test/markdown.test.js test/components.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: link headings to themselves`

### Task 5: "Edit this page" link

**Files:**
- Create: `src/cli/edit-link.js`, `test/edit-link.test.js`
- Modify: `src/cli/config.js`, `src/site/layouts/Docs.astro`, `src/site/lib/strings.js`, `src/site/styles/layout.css`, `test/config.test.js`, `test/reader.test.js`

**Interfaces:**
- Produces: `editHref(editUrl: string, contentDir: string, file: string): string` = `editUrl` without trailing slashes, then `/`, then the path of `file` inside `contentDir` with `/` separators and each segment passed through `encodeURIComponent`. `loadConfig` returns `editUrl` when set; a value that is not an absolute http(s) URL throws `beacon.config: "editUrl" must be an absolute http(s) URL`.

- [ ] **Step 1: Write failing tests.** `test/edit-link.test.js`: `editHref joins the url and the file path inside content` (`'https://github.com/o/r/edit/main/docs/'`, `'/p/content'`, `'/p/content/guide/intro.md'` gives `https://github.com/o/r/edit/main/docs/guide/intro.md`); `editHref encodes spaces and hashes` (`a b#c.md` gives `a%20b%23c.md`). `test/config.test.js`: `editUrl is validated`. `test/reader.test.js`: `edit link points at the source file` asserts `guide/intro/index.html` has `href="https://github.com/acme/docs/edit/main/docs/guide/intro.md"` and the text `Edit this page`; and that `404.html` has none.
- [ ] **Step 2: Run** `node --test test/edit-link.test.js test/config.test.js test/reader.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** Render the link in the same footer row as the pager (inside `<main>`, `data-pagefind-ignore`) only when `config.editUrl` is set and the page has a `file` (404 and redirect pages have none). Add the `editPage` string.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add editUrl and an edit page link`

### Task 6: Publish every page as Markdown

**Files:**
- Modify: `src/cli/content.js`, `src/cli/build.js`, `src/cli/site.js` (dev middleware), `test/content.test.js`, `test/reader.test.js`, `test/dev.test.js`

**Interfaces:**
- Produces from `content.js`: `mdPath(slug: string): string` (`''` gives `index.md`, `guide/intro` gives `guide/intro.md`); `pageMarkdown(page: Page): Promise<string>` (the file's body without frontmatter, normalized to `\n` line endings, ending with exactly one newline; `# ${page.title}\n\n` is prepended when the body has no top-level heading outside code fences).

- [ ] **Step 1: Write failing tests.** `test/content.test.js`: `mdPath maps slugs to files` ; `pageMarkdown strips frontmatter and adds the title when the body has no h1` ; `pageMarkdown keeps an existing h1 and does not add a second` (fixture `own-h1.md`); `pageMarkdown ignores a # line inside a code fence when deciding` (body with only a fenced `# comment` gets the title prepended); `pageMarkdown handles BOM and CRLF`. `test/reader.test.js`: `build writes a .md file per page` asserts `dist/guide/intro.md` starts with `# Introduction` and has no `---`, `dist/index.md` exists, `dist/guide/setup.md` still contains the mdx source verbatim. `test/dev.test.js`: `dev serves /guide/intro.md as text/markdown` (fetch against the existing dev server pattern; assert status 200, `content-type` starts with `text/markdown`, body starts with `# Introduction`, and an unknown `/nope.md` is 404).
- [ ] **Step 2: Run** `node --test test/content.test.js test/reader.test.js test/dev.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** Reuse `parseFrontmatter` and the fence-aware `firstHeading` already in `content.js`. In `build.js`, after the asset copy, write one file per page at `join(config.outDir, mdPath(page.slug))`. In `beaconModule`'s dev middleware, answer `${base}/${mdPath(slug)}` for known pages with `Content-Type: text/markdown; charset=utf-8`, calling `pageMarkdown` per request (so edits show without a reload of the module); fall through otherwise. Add a one-line comment: `shortcut: .mdx is exported verbatim (components and imports included), upgrade if readers need rendered Markdown`.
- [ ] **Step 4: Run** the same command plus `node --test test/build.test.js test/i18n.test.js`. Expected: PASS (`es/guide/intro.md` also exists in the i18n build; add one assertion for it).
- [ ] **Step 5: Commit** `feat: publish each page as Markdown`

### Task 7: "Copy page" button

**Files:**
- Modify: `src/site/lib/copy.js`, `src/site/layouts/Docs.astro`, `src/site/styles/layout.css`, `src/site/lib/strings.js`, `test/interactions.test.js`, `test/reader.test.js`

**Interfaces:**
- Consumes: `mdPath(slug): string` from Task 6 (the layout passes its result to the button as `data-md`, run through `withBase`).
- Produces: `handlePageCopyClick(event, env: {fetch: Function, clipboard: {write?: Function, writeText: Function}, ClipboardItem?: Function}, schedule): Promise<void>` in `copy.js`. It acts only when the click is inside `.copy-page`, reads the URL from `button.dataset.md`, and on success sets the button text to `data.copied ?? 'Copied'`, on any failure (rejected fetch, non-ok response, clipboard error) to `data.failed ?? 'Copy failed'`, then restores `data.copy ?? 'Copy page'` after 2000 ms through `schedule`. When `env.ClipboardItem` exists it must start the write synchronously from the click with a `ClipboardItem` whose `text/plain` value is the pending fetch (Safari rejects a clipboard write that happens after an `await`); otherwise it awaits the text and calls `writeText`.

- [ ] **Step 1: Write failing tests** in `test/interactions.test.js` using the same fake-button style as the existing copy tests: `page copy writes the fetched Markdown and confirms` (ClipboardItem-less env, fetch resolves `{ok:true, text: async () => '# Hi\n'}`, assert `writeText` got `'# Hi\n'`, text became `Copied`, timer resets to `Copy page`); `page copy uses a ClipboardItem when available` (assert `write` was called once, synchronously, before the fetch promise resolves); `page copy reports a failed request without throwing` (`{ok:false}` and a rejected fetch both give `Copy failed`); `page copy ignores clicks elsewhere`. In `test/reader.test.js`: `pages have a copy-page button pointing at their Markdown` asserts `guide/intro/index.html` has `class="copy-page"` with `data-md="/guide/intro.md"` and `data-pagefind-ignore`, and `404.html` has none.
- [ ] **Step 2: Run** `node --test test/interactions.test.js test/reader.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `handlePageCopyClick`, sharing the confirm-and-reset logic with `handleCopyClick` instead of duplicating it. In `Docs.astro` render the button next to the breadcrumbs/title row with `data-copy`, `data-copied`, `data-failed` always set from the page's dictionary; register the handler in the existing delegated click listener with `{ fetch, clipboard: navigator.clipboard, ClipboardItem: globalThis.ClipboardItem }`. Add the `copyPage` string. Style as a small quiet button that does not push the h1 down on narrow screens.
- [ ] **Step 4: Run** the same command plus `node --test test/strings.test.js`. Expected: PASS. Then in `beacon dev`, click the button and paste into a text editor; check once in Chrome and once in Safari if available.
- [ ] **Step 5: Commit** `feat: add a copy page as Markdown button`

### Task 8: `llms.txt`

**Files:**
- Create: `src/cli/llms.js`, `test/llms.test.js`, `src/site/pages/llms.txt.js`
- Modify: `test/reader.test.js`

**Interfaces:**
- Consumes: `mdPath(slug)` from Task 6; `LocPage` from `src/cli/locales.js`.
- Produces: `llmsTxt(config: {site: string, title: string}, pages: LocPage[], locales: string[]): string`. Format: `# <title>`, a blank line, then one list per language (a `## <code>` heading only when `locales.length > 1`), each item `- [<title>](<site>/<mdPath(slug)>): <description>` (the `: description` part only when present). `[` and `]` in titles are backslash-escaped. Pages appear in the given order.

- [ ] **Step 1: Write failing tests** in `test/llms.test.js`: `llmsTxt lists each page with its Markdown URL and description`; `llmsTxt groups by language only when there are several`; `llmsTxt escapes brackets in titles`; `llmsTxt omits the description separator when a page has none`. In `test/reader.test.js`: `build writes llms.txt` asserts `dist/llms.txt` starts with `# Reader` and contains `https://docs.example.com/guide/intro.md`.
- [ ] **Step 2: Run** `node --test test/llms.test.js test/reader.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `llmsTxt` and the endpoint `src/site/pages/llms.txt.js` (same shape as `robots.txt.js`, `Content-Type: text/plain; charset=utf-8`, reading `config`, `pages`, `locales` from `virtual:beacon`).
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: generate llms.txt`

### Task 9: Minimal motion

**Files:**
- Create: `src/site/styles/motion.css`
- Modify: `src/site/layouts/Docs.astro` (import it after `layout.css`), `test/css.test.js`

**Interfaces:**
- Produces: `motion.css`, a single `@media (prefers-reduced-motion: no-preference) { ... }` block holding every `transition`, `animation` and `@keyframes` in the project, plus tokens `--bx-dur: 150ms` and `--bx-ease: ease-out` (defined on `html` inside the block).

- [ ] **Step 1: Write the failing test** in `test/css.test.js`: `motion lives only inside the no-preference media query`. Read `tokens`, `base`, `layout` and `motion`; for each, remove the balanced `@media (prefers-reduced-motion: no-preference) { ... }` block, then assert the remainder matches no `/\b(transition|animation|animation-name|@keyframes|scroll-behavior)\b/`. Also assert `motion.css` contains the media query.
- [ ] **Step 2: Run** `node --test test/css.test.js`. Expected: FAIL (file missing).
- [ ] **Step 3: Implement `motion.css`.** Color/background/border transitions at `--bx-dur` on links, buttons, `.sidebar a`, `.copy`, `.copy-page`, `.toc a`, `.anchor` opacity; the sidebar hide (`.shell` `grid-template-columns` over 200 ms, `.sidebar` `visibility` delayed by the same 200 ms on hide so it stays visible while sliding), `.sidebar-toggle` `left`; a 120 ms fade and 4 px rise on `.search[open]` and its `::backdrop`; chevron rotation on `details[open] > summary`; `html { scroll-behavior: smooth; }`. Nothing else: no entrance animations on page load, no scroll effects.
- [ ] **Step 4: Run** `node --test test/css.test.js test/reader.test.js`. Expected: PASS. Then in a browser: motion plays; with the OS "reduce motion" setting on (or devtools emulation) everything is instant and the sidebar still hides correctly.
- [ ] **Step 5: Commit** `feat: add minimal motion that honors reduced motion`

### Task 10: Docs, budgets and phase summary

**Files:**
- Modify: `README.md`, `scripts/e2e.mjs`
- Create: `docs/superpowers/plans/summaries/reader-features.md`

- [ ] **Step 1: README.** Add `collapsibleSidebar` and `editUrl` rows to the Config table; a short "Reading features" list (copy page, hide sidebar with `[`, anchors, pager, `/<slug>.md` files and `llms.txt`); a Content bullet that every page is also served as `/<slug>.md`, `.mdx` verbatim. Update the budgets table with the new measurements from Step 3.
- [ ] **Step 2: e2e.** Following the file's existing pattern, add two checks to `scripts/e2e.mjs`: the sidebar toggle hides the sidebar and the state survives a reload; the copy-page button changes its label to `Copied`.
- [ ] **Step 3: Measure.** Run `pnpm test`, `pnpm e2e`, then on a built fixture `node scripts/measure-budget.mjs <dist> index.html`, the same with a tabs page and with `--search-open`, and `node scripts/lighthouse.mjs <dist> / /guide/intro/`. Expected: every budget holds, Lighthouse 100/100/100. If the soft target (+2 KB JS, +1.5 KB CSS) is missed, do not trim features silently: record the cause and options in the summary.
- [ ] **Step 4: Summary.** Write `docs/superpowers/plans/summaries/reader-features.md` in the style of the other summaries: what was done, before/after numbers against the budgets, what remains open.
- [ ] **Step 5: Commit** `docs: document reader features and add their summary`
