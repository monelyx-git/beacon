# 0004. Shiki for syntax highlighting

Status: accepted

## Context
Code blocks must be highlighted with zero JS for the reader, and be dark in both themes (design spec).

## Decision
Use Shiki at build time. It comes with Astro (`shiki` 4.x is part of Astro's Markdown pipeline), so Beacon adds no direct dependency and does not configure it: Astro's default `github-dark` theme is dark in both themes, and unlabeled fences fall back to `plaintext`. Output is inline-styled HTML, so no highlighter code or CSS reaches the reader.

## Consequences
- A custom theme or extra languages would require configuring Astro's Markdown processor, which in Astro 7 means installing `@astrojs/markdown-satteri` (new dependency, new ADR).
- Highlighting cost is paid at build time only.
- Token colors come from the theme; contrast is checked by Lighthouse in the acceptance runs.
