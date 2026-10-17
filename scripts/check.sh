#!/usr/bin/env sh
#
# Full verification suite for the monorepo: type-check -> lint -> boundaries ->
# test -> build. Runs the fast checks first so a type or lint error fails before
# the slow build. Any failing step aborts the script (turbo exits non-zero).
#
# Usage:
#   bun run check       # from the repo root
#   sh scripts/check.sh
#
set -e

# Always run from the repo root regardless of where the script is invoked.
cd "$(dirname "$0")/.."

echo "▶ [1/5] Type-checking…"
turbo run check-types

echo "▶ [2/5] Linting…"
turbo run lint

echo "▶ [3/5] Checking package boundaries…"
bun run check-boundaries

echo "▶ [4/5] Testing…"
turbo run test

echo "▶ [5/5] Building…"
turbo run build

echo "✓ All checks passed."
