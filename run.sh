#!/usr/bin/env bash
# One-command runner for the Day 9 MCP assignment.
# Usage:  ./run.sh          (everything)
#         ./run.sh task1    (performance trace only)
#         ./run.sh task2    (debugging story only)
set -e
cd "$(dirname "$0")/harness"
[ -d node_modules ] || npm install --no-audit --no-fund
node run.mjs "${1:-all}"
