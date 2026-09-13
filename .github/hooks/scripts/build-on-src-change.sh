#!/usr/bin/env bash
# Force-rebuild the committed bundle after a change under src/ so that
# dist/index.js stays in sync with the TypeScript source.
set -euo pipefail

payload="$(cat)"

tool_name="$(printf '%s' "$payload" | node -e '
let data = "";
process.stdin.on("data", (c) => (data += c));
process.stdin.on("end", () => {
  try {
    console.log(JSON.parse(data).tool_name || "");
  } catch {
    console.log("");
  }
});
')"

case "$tool_name" in
  create_file|replace_string_in_file|insert_edit_into_file|edit_notebook_file) ;;
  *) exit 0 ;;
esac

file_path="$(printf '%s' "$payload" | node -e '
let data = "";
process.stdin.on("data", (c) => (data += c));
process.stdin.on("end", () => {
  try {
    console.log(JSON.parse(data).tool_input?.filePath || "");
  } catch {
    console.log("");
  }
});
')"

case "$file_path" in
  */src/*|src/*) ;;
  *) exit 0 ;;
esac

echo "src changed ($file_path); rebuilding dist/index.js ..."
bun run build

if [ ! -f dist/index.js ]; then
  echo "ERROR: bun run build did not produce dist/index.js" >&2
  exit 2
fi

echo "dist/index.js is now in sync"
