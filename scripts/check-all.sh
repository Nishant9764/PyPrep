#!/usr/bin/env bash
# Everything that can be verified without a database: content, types, unit tests, builds,
# and the code-runner isolation tests. (The full-stack API test needs the stack running:
# `npm run test:e2e`.)
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
step() { echo; echo "==> $1"; shift; "$@" || { echo "FAILED: $*"; fail=1; }; }

step "Curriculum: structure, concept map, every reference solution passes, every starter fails" python3 content/validate.py
step "Runner typecheck"          npm --prefix runner run typecheck
step "Runner isolation tests (infinite loops, memory/fork bombs, output floods, privilege checks)" npm --prefix runner test
step "Server typecheck"          npm --prefix server run typecheck
step "Server unit tests (mastery, diagnosis, recommendations)" npm --prefix server test
step "Client typecheck + build"  npm --prefix client run build

echo
if [ $fail -eq 0 ]; then echo "All checks passed."; else echo "Some checks FAILED."; exit 1; fi
