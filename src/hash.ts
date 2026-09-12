import { createHash, type Hash } from "node:crypto";
import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const SKIP_DIRS = new Set([
  "bin",
  "build",
  "dist",
  "node_modules",
  "obj",
  "target",
  "zig-cache",
  "zig-out",
]);

/**
 * Computes a deterministic fingerprint of the files that influence a Zig build
 * (`build.zig`, `build.zig.zon`, and `*.zig` sources), excluding build outputs
 * and dependencies.
 */
export async function hashBuildInputs(workspace: string): Promise<string> {
  const hash = createHash("sha256");
  await walk(workspace, workspace, hash);
  return hash.digest("hex").slice(0, 12);
}

async function walk(dir: string, workspace: string, hash: Hash): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) {
        continue;
      }
      await walk(full, workspace, hash);
    } else if (
      entry.name === "build.zig" ||
      entry.name.endsWith(".zig") ||
      entry.name.endsWith(".zon")
    ) {
      const relative = path.relative(workspace, full);
      hash.update(relative);
      hash.update("\u0000");
      hash.update(await readFile(full));
      hash.update("\u0000");
    }
  }
}
