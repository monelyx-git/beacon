# Phase 2 summary: content fidelity

## Done
- `.md` stays on the plain Markdown pipeline and `.mdx` on MDX; GFM tables, task lists and heading ids/TOC are covered by guard tests. Astro already behaved correctly, so there was no new production code; the tests were proven non-vacuous (the same content as `.mdx` fails on `{braces}`).
- Relative `.md`/`.mdx` links are rewritten to site paths (anchors kept, base path applied). Links to docs outside `content/` render as plain text with `warn: <file>: link to <href> is outside content, rendered as text`, as agreed in Q3.
- ADR 0004 (Shiki). No config change needed: Astro's default is `github-dark`, dark in both themes, zero reader JS.
- `scripts/accept-pier.sh` builds Pier's five user-facing docs, copied unmodified: 5 pages, exit 0, and the only warnings are the two expected out-of-scope links (`troubleshooting.md`, `adr/0034-...`).
- 31 tests passing.

## Measured (Pier build, 5 pages)
| Metric | Result | Budget |
|---|---|---|
| JS, gzipped | 0.10 KB | < 30 KB |
| CSS, gzipped | 1.42 KB | < 20 KB |
| Lighthouse perf / a11y | 100 / 100 on `/getting-started/`, `/install/`, `/notifications/` (also 100 perf on the other two) | 100 |
| Lighthouse SEO | 90: missing meta description on pages without frontmatter | 100 |

Running Lighthouse on the real Pier pages, not the fixture, found two problems that I fixed:
- A Phase 1 bug: my `--accent` variable collided with Pier's own `--accent` token, which made dark-mode links and the active sidebar item almost invisible. It is fixed, with a test that stops Beacon's custom properties shadowing the vendored tokens.
- `github-dark` comment color was 3.04:1 against the code background. A CSS-only override now passes 4.5:1.

## Decisions to know about
- Link rewriting is a string pass over the rendered page, not a rehype plugin. In Astro 7, rehype plugins need `@astrojs/markdown-remark`, a new dependency that needs an ADR (AGENTS rule 4). The string pass adds nothing and works in dev and build. The cost is regex over anchors, noted in code. It must be re-verified with React islands in Task 4.2.

## Open
- **SEO 90** until Task 3.2 adds a fallback meta description (first paragraph) for pages without frontmatter.
- Pier's docs have no `index.md`, so the site root `/` has no page. A real site needs a landing page; I propose redirecting `/` to the first page when no root index exists. This is not in the spec or the plan, so I will not build it unless you want it.
- Astro writes `.astro/` into the package root during a build; verify on a packed install (Task 6.2).
- Lighthouse single runs are noisy (one cold run scored 82); CI should use the median of three.
