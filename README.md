# Beacon by Monelyx

A minimal documentation generator. Point it at a folder of Markdown or MDX and it builds a fast static site: three-column layout, light and dark themes, syntax highlighting, search with no server, and almost no JavaScript for readers.

```
my-docs/
  content/            .md and .mdx files
  beacon.config.json
```

```sh
npm install --save-dev @monelyx/beacon
npx beacon build      # writes dist/
npx beacon dev        # live reload at http://127.0.0.1:4321
```

Requires Node 22.2 or newer. Install it where your user can write (a project devDependency is fine): Astro writes generated files next to the bundled site, so a read-only install fails with a clear message. Search is built by `beacon build`; the dev server has no search.

## Config

`beacon.config.json` (or `.js` / `.mjs` exporting a default object):

| Field | Required | Meaning |
|---|---|---|
| `site` | yes | Absolute URL where the docs are served, for example `https://docs.example.com` or `https://example.com/docs`. Used for canonical links, Open Graph and the sitemap. |
| `title` | no | Site name. Default `Docs`. |
| `accent` | no | Accent color as `#rrggbb`. Default is Pier's orange. Must have at least 3:1 contrast against both theme backgrounds. |
| `logo` | no | Path to an image in your project, shown in the sidebar. |

## Content

- Pages are `.md` or `.mdx` files in `content/`. Frontmatter is optional: `title`, `description`, `order`.
- Title falls back to the first `# heading`, then the file name. Description falls back to the first paragraph.
- The sidebar follows the folder structure. `order` sorts within a folder; ties sort alphabetically. `index.md` is the folder's own page.
- Relative links between pages (`./install.md#linux`) are rewritten. A link to a file outside `content/` is rendered as plain text with a build warning.
- In `.mdx`, these components need no import: `<Callout type="note|tip|warning|danger" title="...">`, `<Steps>` wrapping an ordered list, and `<Tabs>` with `<Tab label="...">` children. Without JavaScript all tab panels are shown.

## Performance budgets (gzipped, measured)

| State | JS | CSS |
|---|---|---|
| Reading page | under 30 KB (about 2 KB) | under 20 KB (about 2.6 KB) |
| Page with tabs | under 30 KB (about 11 KB) | |
| Search open (page without tabs) | under 36 KB (about 34 KB; Pagefind's runtime is most of it) | |
| Search open on a page with tabs | about 41 KB (not budgeted: the tabs runtime loads too) | |

Lighthouse is 100 for performance, accessibility and SEO. `node scripts/measure-budget.mjs <dist> <page> [--search-open]` and `node scripts/lighthouse.mjs <dist> <paths...>` check this; `node scripts/e2e.mjs` runs the browser checks (needs Chrome).

## Development

```sh
pnpm install
pnpm test            # unit and build tests
pnpm e2e             # real-browser checks
```

Design: `docs/superpowers/specs/`. Plan and phase summaries: `docs/superpowers/plans/`. Dependency decisions: `docs/adr/`.
