# 0007. @astrojs/preact integration

Status: accepted

## Context
Astro needs a renderer integration to server-render and hydrate Preact islands. The design said "Preact via alias"; aliasing React to `preact/compat` with `@astrojs/react` would still require installing `react` and `react-dom`.

## Decision
Add `@astrojs/preact` (first-party, versioned with Astro) and `preact`. No React packages and no alias.

## Consequences
- Same behavior as the alias with fewer installed packages.
- Pages without islands ship nothing from this integration.
