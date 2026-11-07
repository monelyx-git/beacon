# 0006. Preact for interactive islands (replaces React from the design)

Status: accepted (owner approved on 2026-11-06; supersedes the "React islands" row of the design's stack table)

## Context
The design chose React islands and named Preact as the fallback if React blew the interactive budget. Measured in a spike: one trivial React island shipped 70.13 KB gzipped JS (react-dom client 65.7 KB) against a 30 KB budget.

## Decision
Use `preact` for islands that need a framework (tabs now, search UI later), through Astro's first-party `@astrojs/preact` integration (ADR 0007). Islands are authored as `.jsx`. Copy button and theme toggle are not islands: they are tiny vanilla scripts, because they appear on nearly every page.

## Consequences
- Framework cost on pages with islands drops by an order of magnitude (measured in Task 4.2).
- Authors never write components; Beacon provides them to MDX.
- React is not a dependency. Libraries that need real React are out of scope for v1.
