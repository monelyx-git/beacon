# 0001. Astro for site generation

Status: accepted

## Context
Beacon must turn a folder of Markdown into a static, SEO-friendly site with near-zero reader JS. Pier's landing page already uses Astro, so tokens and know-how are shared.

## Decision
Use `astro` (same major as Pier's landing, 7.x) as the site generator. The package bundles the Astro project and runs it programmatically against the user's `content/`; user projects contain no Astro code. Astro also provides the Markdown pipeline and Shiki.

## Consequences
- Static HTML by default; JS only for islands.
- Install size is larger than a hand-built pipeline; accepted by the design.
- Alternative rejected: a from-scratch pipeline (unified + templates). More code to maintain for little gain.
