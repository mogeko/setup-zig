import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Extracts the `minimum_zig_version` field from a `build.zig.zon` file.
 * The field is declared as `.minimum_zig_version = "0.14.0"`.
 */
export function extractMinimumZigVersion(zon: string): string | undefined {
  const match = zon.match(/\.minimum_zig_version\s*=\s*"([^"]+)"/);
  return match?.[1];
}

/**
 * Searches for `build.zig.zon` starting at `startDir` and walking up the
 * parent directories (matching Zig's own lookup order). Returns the first
 * `minimum_zig_version` found, if any.
 */
export async function readMinimumZigVersion(
  startDir: string,
): Promise<string | undefined> {
  let dir = path.resolve(startDir);
  for (;;) {
    const version = await tryReadMinimumZigVersion(
      path.join(dir, "build.zig.zon"),
    );
    if (version !== undefined) {
      return version;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
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
