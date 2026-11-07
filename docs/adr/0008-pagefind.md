# 0008. Pagefind for client-side search

Status: accepted (owner approved on 2026-11-06)

## Context
v1 needs search with a static index and no server. Pagefind builds a chunked index after the site build and loads only the fragments a query needs.

## Decision
Add `pagefind` and run it through its Node API over `dist/` at the end of `beacon build`. Only the page body (`data-pagefind-body`) is indexed. The index, its JS and WASM load on demand when the search dialog opens; nothing from Pagefind loads on page load. The UI is our own small Preact dialog, not Pagefind's default UI.

## Consequences
- Plain pages ship only a ~0.5 KB vanilla loader. Search JS, the Pagefind runtime, the WASM and index fragments are fetched on first open and reported separately from the JS budget.
- Pagefind ships a platform binary (optional dependencies); CI and packaging must install it for the target platform.
- Fallback if rejected later: a small hand-built JSON index; it would only change this task.
