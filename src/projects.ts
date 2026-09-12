import { readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Returns the Zig project root — the nearest ancestor directory of `startDir`
 * containing a `build.zig` file — matching Zig's own lookup order. Returns
 * `undefined` when none is found.
 */
export async function findProjectRoot(
  startDir: string,
): Promise<string | undefined> {
  let dir = path.resolve(startDir);
  for (;;) {
    if (await hasBuildZig(dir)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

async function hasBuildZig(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.some((e) => e.isFile() && e.name === "build.zig");
  } catch {
    return false;
  }
}
