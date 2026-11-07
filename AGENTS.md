# AGENTS.md

Working rules for agents.

1. **Write everything in English:** code, comments, identifiers, logs, errors, UI copy, tests, commits, PRs and docs. Do not add i18n yet.
2. Work in phases and in order (defined in the implementation plan); do not pull in work from future phases except minimal scaffolding.
3. One commit per task, with a Conventional Commits message.
4. Do not add dependencies without an ADR. Do not change a stack decision without an ADR and without notifying the owner.
5. When something is ambiguous and affects security, user data or architecture, **ask** before deciding.
6. Never disable a security or quality check to make CI pass; fix the cause.
7. Never store real secrets in the repo; use generated test values.
8. At the end of each phase, publish a short summary: what was done, what was measured against the budgets, what remains open.
9. If a budget is not met, document the cause and propose options instead of relaxing the budget.
10. Never add `Co-Authored-By` trailers (or any other attribution lines) to commit messages.

The design lives in `docs/superpowers/specs/`. Read it before planning or building.
11. After every npm publish, always create the matching `vX.Y.Z` git tag and add that version's entry to `CHANGELOG.md`.
