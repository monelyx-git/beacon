#!/usr/bin/env bash
# Builds Pier's five user-facing docs, copied unmodified, and checks the acceptance criteria.
# Usage: scripts/accept-pier.sh   (PIER_DOCS overrides the docs folder)
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
docs="${PIER_DOCS:-$here/../pier-by-monelyx/docs}"
pages="getting-started install backups-and-restore notifications monorepos"

tmp="$(mktemp -d)"; mkdir "$tmp/content"
for p in $pages; do cp "$docs/$p.md" "$tmp/content/$p.md"; done
echo '{ "site": "https://docs.pier.example", "title": "Pier" }' > "$tmp/beacon.config.json"

node "$here/bin/beacon.js" build --root "$tmp" 2> "$tmp/stderr.txt"

for p in $pages; do
  cmp -s "$docs/$p.md" "$tmp/content/$p.md" || { echo "FAIL: $p.md differs from the original"; exit 1; }
  [ -f "$tmp/dist/$p/index.html" ] || { echo "FAIL: no page built for $p"; exit 1; }
  grep -q '<h1' "$tmp/dist/$p/index.html" || { echo "FAIL: $p has no h1"; exit 1; }
  if grep -qE 'href="[^"]*\.mdx?[#"]' "$tmp/dist/$p/index.html"; then echo "FAIL: $p still links to a .md file"; exit 1; fi
done

unexpected="$(grep -v -E 'link to (\./)?(troubleshooting\.md|adr/[^ ]*) is outside content' "$tmp/stderr.txt" || true)"
[ -z "$unexpected" ] || { echo "FAIL: unexpected build output:"; echo "$unexpected"; exit 1; }

echo "OK: 5 Pier pages built unmodified. Expected warnings:"; cat "$tmp/stderr.txt"
echo "dist: $tmp/dist"
