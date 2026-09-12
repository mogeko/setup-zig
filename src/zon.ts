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
 * Extracts the `minimum_zig_version` field from a `build.zig.zon` file.
 * The field is declared as `.minimum_zig_version = "0.14.0"`.
 */
export function extractMinimumZigVersion(zon: string): string | undefined {
  const match = zon.match(/\.minimum_zig_version\s*=\s*"([^"]+)"/);
  return match?.[1];
}

/**
 * Searches for `build.zig.zon` starting at `workspace` (root first, then
 * subdirectories depth-first) and returns its `minimum_zig_version`, if any.
 */
export async function readMinimumZigVersion(
  workspace: string,
): Promise<string | undefined> {
  return searchForMinimumZigVersion(workspace);
}

async function searchForMinimumZigVersion(
  dir: string,
): Promise<string | undefined> {
  const version = await tryReadMinimumZigVersion(
    path.join(dir, "build.zig.zon"),
  );
  if (version !== undefined) {
    return version;
  }

  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return undefined;
  }

  const subdirs = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !SKIP_DIRS.has(entry.name),
    )
    .map((entry) => entry.name)
    .sort();

  for (const name of subdirs) {
    const found = await searchForMinimumZigVersion(path.join(dir, name));
    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

async function tryReadMinimumZigVersion(
  zonPath: string,
): Promise<string | undefined> {
  try {
    const content = await readFile(zonPath, "utf8");
    return extractMinimumZigVersion(content);
  } catch {
    return undefined;
  }
}
