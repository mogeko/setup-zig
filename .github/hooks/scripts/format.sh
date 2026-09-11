#!/usr/bin/env bash
# Auto-format the workspace with Biome after file-modifying tools.
# Reads the PostToolUse payload from stdin and only formats when a file was written.
set -euo pipefail

payload="$(cat)"

tool_name="$(printf '%s' "$payload" | node -e '
let data = "";
process.stdin.on("data", (chunk) => (data += chunk));
process.stdin.on("end", () => {
  try {
    console.log(JSON.parse(data).tool_name || "");
  } catch {
    console.log("");
  }
});
')"

case "$tool_name" in
  create_file|replace_string_in_file|insert_edit_into_file|edit_notebook_file)
    pnpm run fmt
    ;;
  *)
    # Not a file-modifying tool; skip formatting.
    ;;
esac

exit 0
