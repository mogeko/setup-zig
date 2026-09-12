#!/usr/bin/env bash
# Run the action locally with @github/local-action, bypassing its `pnpm dlx`
# wrapper (which re-fetches tsx and trips pnpm's build-script approval).
set -euo pipefail

cd "$(dirname "$0")/.."

export TARGET_ACTION_PATH="$PWD"
export NODE_PACKAGE_MANAGER="pnpm"

exec tsx node_modules/@github/local-action/src/index.ts -- run . src/main.ts .env
