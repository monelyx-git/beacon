# 0003. Lighthouse as a devDependency

Status: accepted

## Context
The design sets Lighthouse 100 for performance, accessibility and SEO as a goal. It must be measured, not assumed, and re-checked in CI.

## Decision
Add `lighthouse` as a devDependency only. It is never shipped to users. A script serves `dist/` locally and runs it headless against the built pages. It needs a local Chrome (`CHROME_PATH` if not auto-detected).

## Consequences
- Large dev install; no effect on package size.
- Alternative rejected: hosted PageSpeed Insights (needs a public URL, not reproducible in CI).
