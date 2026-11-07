# 0005. Fontsource for Bricolage Grotesque

Status: accepted

## Context
Headings use Bricolage Grotesque (Pier's identity). The design requires it to be self-hosted, never loaded from Google Fonts.

## Decision
Add `@fontsource-variable/bricolage-grotesque` (variable font, `wght` axis). Only the Latin subset is preloaded; other subsets are declared with `unicode-range` and download only if a page needs those characters. Body and code use system stacks. `font-display: swap`.

## Consequences
- One font file (Latin, woff2) on the critical path; reported separately from the JS/CSS budget.
- No third-party requests, no Google Fonts.
- Alternative rejected: committing the woff2 by hand. Same result, but nothing to track upstream fixes.
