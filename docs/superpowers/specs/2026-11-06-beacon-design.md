# Beacon by Monelyx: design

## Intent

Beacon is a minimal documentation generator for the Monelyx ecosystem. You point it at a folder of `.mdx` files and it builds a fast, static, SEO-friendly docs site with the fumadocs experience and far less weight. Pier is the first client (its docs move to Beacon once v1 works), so the tool is proven on a real product from day one.

Why: fumadocs is good but heavy and framework-coupled. Monelyx wants docs that look like Monelyx, load almost instantly, and need nothing from the author but content and a small config.

## Goals

- **Static output.** Every page is pre-rendered HTML, crawlable, with near-zero JS for readers.
- **Small and fast.** Budget target (my call, to be measured): reading a page ships < 30 KB of JS and < 20 KB of CSS; Lighthouse 100 for performance, accessibility, SEO.
- **Easy.** `content/` folder + `beacon.config.*` + `beacon build`. No app code in the user's project.
- **Looks like Monelyx.** Pier's visual identity: gray-green background, petrol-blue text, orange accent, Bricolage Grotesque for headings, system fonts for body and code. Light and dark themes.
- **Themeable accent.** One `accent` value in the config; orange by default, so other Monelyx products can use their own color.
- **Few dependencies.** Anything added needs a clear reason; each lands with an ADR (same rule as Pier).

## v1 scope (decided)

- Sidebar generated from the folder structure, with a fixed left sidebar, centered content and a right-hand table of contents (the "three column" layout, chosen from mockups).
- Light/dark mode, syntax highlighting, SEO (sitemap, metadata, Open Graph).
- Client-side search with a static index, no server.
- MDX components: callouts, tabs, steps, code blocks with a copy button.

## Non-goals

Versioned docs, multiple languages, changelog pages, OpenAPI reference generation, a hosted service, a CMS or visual editor. Not in v1; revisit later.

## Anti-goals

- A site that needs a server or a runtime to be read.
- Pulling in Tailwind or a UI kit to get the look.
- Users having to understand Astro or React to write docs.
- Beautiful but heavy: if a budget is missed, document why instead of relaxing it.

## Decided stack

| Concern | Choice | Notes |
|---|---|---|
| Delivery | Standalone CLI, package published with scope (e.g. `@monelyx/beacon`) | Plain `beacon` on npm is almost certainly taken; scope availability still to be checked. |
| Site generation | Astro + `@astrojs/mdx` + `@astrojs/react` | Landing page of Pier already uses Astro, so tokens and know-how are shared. Pipeline-from-scratch was considered and rejected: more code to maintain for little gain. |
| Interactivity | React islands only where needed (tabs, search UI, theme toggle, copy button), hydrated lazily | Everything else is static HTML. |
| Code highlighting | Shiki at build time | Zero JS for the reader. |
| Search | Pagefind (static index, loaded on demand) | Proposed by me, not yet confirmed as a dependency. |
| Styling | Plain CSS with custom properties | Tokens derived from Pier's `landing/src/styles/tokens.css`. |
| Fonts | Bricolage Grotesque for headings; system stack for body and monospace | |

## Visual reference

Layout A (three columns) in the Pier identity, light and dark: sidebar with logo, search (⌘K) and grouped links; breadcrumb, large heading, content with code blocks and callouts; "On this page" at the right with the active section highlighted in the accent color. Active sidebar item is tinted with the accent. Code blocks are dark in both themes. Mockup: `.superpowers/brainstorm/.../layout-a-branded.html` (throwaway, not committed).

## Constraints

- Repo: `/Users/f.bernabe/Documents/freilyn/monelyx/beacon-by-monelyx` (empty, not yet a git repo).
- Conventions carried over from Pier (my call, confirm): everything in English, Conventional Commits, one commit per task, no dependencies without an ADR, no real secrets, never weaken a check to pass CI.
- Node version aligned with Pier's landing (`>=22`), pnpm.

## Left to the builder

Config file format and fields beyond `title`, `accent` and `logo`; CLI command surface beyond `build` (a `dev` server with hot reload is expected); folder-to-navigation ordering rules (frontmatter vs. file names); package layout (monorepo vs. single package); test strategy; exact budgets and how to measure them in CI.

## Calls made after the builder check (my calls, please review)

- **Pier as first client.** Pier's `docs/` holds ~30 plain `.md` files, mostly internal (phase baselines, ADRs, ASVS). Only a handful are user-facing: `getting-started`, `install`, `backups-and-restore`, `notifications`, `monorepos`. Acceptance for v1: those pages build in Beacon with no content rewrite. So Beacon accepts both `.md` and `.mdx`; frontmatter is optional (`title`, `description`, `order`), title falls back to the first `# heading`. Internal docs stay in Pier.
- **Packaging.** The package bundles the Astro project and runs it programmatically against the user's `content/` and config, so the user project has no Astro code. Install size is accepted as the cost of using Astro.
- **JS budget.** React stays. A page ships no framework JS until an island is needed: the theme script is inline (< 1 KB), islands hydrate on idle/interaction, and the budget (gzipped) is measured on a plain page with no interaction, then again with search open. If React blows the interactive budget, the fallback is Preact via alias, which needs an ADR and a note to the owner.
- **Search.** Pagefind assumed. If rejected, fall back to a small hand-built static index; this only affects the search task.
- **Tokens and fonts.** Pier's tokens are copied as a vendored snapshot (no cross-repo sync in v1). Bricolage Grotesque is self-hosted via Fontsource, never loaded from Google Fonts.
- **Site URL.** The config has a required `site` field (sitemap, canonical, OG). OG image: one default image per site in v1, not one per page.

## Open points

- Confirm the scoped npm name and that the Monelyx npm org exists.
- Confirm Pagefind is acceptable as a dependency.
- Confirm English-only and Pier's working rules apply to this repo.
