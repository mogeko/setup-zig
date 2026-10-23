import type { Dirent } from "node:fs";
import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

/** Default maximum size of a single cache directory, in MiB. */
export const DEFAULT_CACHE_SIZE_LIMIT_MIB = 2048;

/**
 * Parses the `cache-size-limit` input (MiB). An empty value uses the default
 * and `0` disables the limit.
 */
export function parseCacheSizeLimit(input: string): number {
  const trimmed = (input ?? "").trim();
  if (trimmed === "") {
    return DEFAULT_CACHE_SIZE_LIMIT_MIB;
  }
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(
      `Invalid cache-size-limit "${input}": expected a non-negative integer (MiB)`,
    );
  }
  return Number.parseInt(trimmed, 10);
}

/** Total size of the files under `dir`, in bytes. Missing files count as 0. */
export async function dirSize(dir: string): Promise<number> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }

  let total = 0;
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await dirSize(full);
    } else if (entry.isFile()) {
      try {
        total += (await stat(full)).size;
      } catch {
        // The file disappeared while walking the directory.
      }
    }
  }
  return total;
}

/** Removes the contents of `dir` while keeping the directory itself. */
export async function clearDir(dir: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    entries.map((name) =>
      rm(path.join(dir, name), { recursive: true, force: true }),
    ),
  );
}
