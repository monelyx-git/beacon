# 0002. @astrojs/mdx for `.mdx` content

Status: accepted

## Context
Beacon accepts `.md` and `.mdx`. Callouts, tabs and steps are used from MDX. Astro handles `.md` natively but not `.mdx`.

## Decision
Add `@astrojs/mdx`. Plain `.md` files stay on the plain Markdown pipeline, so raw HTML and braces in Pier-style prose are not parsed as JSX.

## Consequences
- One extra first-party integration, versioned with Astro.
- Alternative rejected: `@mdx-js/mdx` directly. More glue, no benefit.
