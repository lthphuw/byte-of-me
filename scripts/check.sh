#!/usr/bin/env sh
#
# Full verification suite for the monorepo: type-check -> lint -> test -> build.
# Runs the fast checks first so a type or lint error fails before the slow
# build. Any failing step aborts the script (turbo exits non-zero).
#
# Usage:
#   pnpm check          # from the repo root
#   sh scripts/check.sh
#
set -e

# Always run from the repo root regardless of where the script is invoked.
cd "$(dirname "$0")/.."

echo "▶ [1/4] Type-checking…"
turbo run check-types

echo "▶ [2/4] Linting…"
turbo run lint

echo "▶ [3/4] Testing…"
turbo run test

echo "▶ [4/4] Building…"
turbo run build

echo "✓ All checks passed."
