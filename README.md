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

Requires Node 22.2 or newer. Tested on macOS and Linux; Windows is untested. Install it where your user can write (a project devDependency is fine): Astro writes generated files next to the bundled site, so a read-only install fails with a clear message. Search is built by `beacon build`; the dev server has no search.

## Config

`beacon.config.json` (or `.js` / `.mjs` exporting a default object):

| Field | Required | Meaning |
|---|---|---|
| `site` | yes | Absolute URL where the docs are served, for example `https://docs.example.com` or `https://example.com/docs`. Used for canonical links, Open Graph and the sitemap. |
| `title` | no | Site name. Default `Docs`. |
| `accent` | no | Accent color as `#rrggbb`. Default is Pier's orange. Must have at least 3:1 contrast against both theme backgrounds. |
| `logo` | no | Path to an image in your project, shown in the sidebar. A `.html` file is inlined as-is instead, so you can build the whole brand (icon plus wordmark). Use inline `style` or a `<style>` tag; there are no utility classes, and theme colors are available as CSS variables. |
| `favicon` | no | Path to an icon in your project (`.svg`, `.png` or `.ico`), used as the browser tab icon. |

## Content

- Pages are `.md` or `.mdx` files in `content/`. Frontmatter is optional: `title`, `description`, `order`.
- Title falls back to the first `# heading`, then the file name. Description falls back to the first paragraph.
- The sidebar follows the folder structure. `order` sorts within a folder; ties sort alphabetically. `index.md` is the folder's own page.
- **The site root `/`**: `content/index.md` is the home page. Without one, `/` is a small redirect page (`noindex`, not in `sitemap.xml` or search) to the first page in sidebar order, and the build prints which page that is. To choose the landing page, add `content/index.md` or give a page `order: 1`.
- **Unknown URLs**: the build writes `404.html` (sidebar included, `noindex`, not in the sitemap or search). Most static hosts (Cloudflare Pages, Netlify, GitHub Pages) serve it automatically; `beacon dev` serves it with a 404 status.
- Relative links between pages (`./install.md#linux`) are rewritten. A link to a file outside `content/` is rendered as plain text with a build warning.
- Images: `![alt](./img/pic.png)` in Markdown is handled by Astro (optimized, hashed, lazy-loaded). Any other file in `content/` (PDFs, raw `<img>` tags, downloads) is copied to the same relative path in `dist/`, and relative links to it are rewritten so they work from any page. A relative image that does not exist is reported as a build warning.
- File and folder names need at least one ASCII letter or digit (`日本語.md` is a build error, not a wrong URL). Frontmatter supports single-line `key: value` pairs only.
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
