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

/** Reads `build.zig.zon` from the workspace root and returns its minimum Zig version, if any. */
export async function readMinimumZigVersion(
  workspace: string,
): Promise<string | undefined> {
  try {
    const content = await readFile(
      path.join(workspace, "build.zig.zon"),
      "utf8",
    );
    return extractMinimumZigVersion(content);
  } catch {
    return undefined;
  }
}
