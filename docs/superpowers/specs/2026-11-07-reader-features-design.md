# Beacon reader features: design

## Intent

Make Beacon pages nicer to read and easier to hand to people and to AI tools, without giving up what Beacon is: tiny, static, near-zero JS. Every feature below is either pure CSS/HTML, or a few lines in the one delegated page script.

## Goals

- Copy a page as Markdown (button on every page), and publish the same Markdown at a stable URL.
- Hide and show the sidebar, remembered across pages, with a keyboard shortcut.
- Optional collapsible sidebar groups.
- Minimal motion that respects `prefers-reduced-motion`.
- Small reading aids: previous/next links, heading anchor links, an "Edit this page" link.
- `llms.txt` generated at build.

## Non-goals

Feedback widgets (need a backend), "last updated" dates (git history is wrong on shallow CI clones and costs a process per page), a per-page "view as Markdown" route in the UI, search changes, any new dependency, any new JS island. Not needed: a TOC and `⌘K` search already exist.

## Anti-goals

- A feature that makes the reading page ship noticeably more JS or CSS. Budgets from the main design stay: JS < 30 KB, CSS < 20 KB, theme inline script < 1 KB. Soft target for this work (my call): at most +2 KB gz JS and +1.5 KB gz CSS on a plain page.
- Any behavior that changes a site's output unless the author opts in (config) or the feature is purely additive chrome.
- Motion that cannot be turned off by the OS setting.

## Decisions (my calls, please review)

- **Markdown export:** `beacon build` writes `<slug>.md` next to each page (`/guide/intro/` has `/guide/intro.md`; the root page has `/index.md`). It is the source body without frontmatter, with `# Title` prepended when the body has no `# ` heading. The button fetches that file and copies it. `.mdx` is exported verbatim (components and imports included). The dev server serves the same URLs.
- **Sidebar hide:** state is `beacon-sidebar` = `hidden` in localStorage, applied by the existing inline head script as a class on `<html>` (no flash). Hidden uses `visibility: hidden`, so links leave the tab order. Shortcut `[`, ignored while typing. Below 1024px the sidebar is already a plain block, so the toggle and the preference do nothing there.
- **Sections:** folders already render as group labels. The new opt-in `"collapsibleSidebar": true` turns every node with children into a `<details>`, open when it holds the current page. No JS.
- **Anchors:** a plain `#` link on h2-h4, no copy-to-clipboard JS. Clicking updates the URL, which the reader can copy.
- **Edit link:** opt-in `"editUrl": "https://github.com/org/repo/edit/main/docs"`; the link is `editUrl` + the file's path inside `content/`.
- **`llms.txt`:** an index only (title, then a link and description per page, grouped by language when there are several). No `llms-full.txt`.
- **Motion:** one `motion.css`, everything inside `@media (prefers-reduced-motion: no-preference)`; a test fails if a `transition`/`animation` appears outside it. 120-200 ms.
- New chrome strings (`copyPage`, `toggleSidebar`, `previous`, `next`, `pager`, `editPage`, `anchor`) go in both dictionaries.

## Left to the builder

Exact pixel placement of the sidebar toggle and the copy-page button (check in a real browser), the chevron glyph for collapsible groups, easing values.
