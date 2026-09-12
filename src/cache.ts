import os from "node:os";
import path from "node:path";
import * as cache from "@actions/cache";
import * as core from "@actions/core";

export type CacheMode = "binary" | "all" | "false";

const VALID_MODES: CacheMode[] = ["binary", "all", "false"];

export function parseCacheMode(input: string): CacheMode {
  const normalized = (input || "binary").toLowerCase();
  if (!VALID_MODES.includes(normalized as CacheMode)) {
    throw new Error(
      `Invalid cache input "${input}": expected one of ${VALID_MODES.join(", ")}`,
    );
  }
  return normalized as CacheMode;
}

/** Cache key for the downloaded Zig archive (platform + version). */
export function tarballCacheKey(triple: string, version: string): string {
  return `setup-zig-tarball-${triple}-${version}`;
}

/** Cache key for the Zig global compile cache. */
export function globalCacheKey(triple: string, version: string): string {
  return `setup-zig-global-cache-${triple}-${version}`;
}

/** Cache key for the project-local Zig cache (`.zig-cache`). */
export function localCacheKey(
  triple: string,
  version: string,
  buildHash: string,
): string {
  return `setup-zig-local-cache-${triple}-${version}-${buildHash}`;
}

/** Restore-key prefix for the local cache, falling back to any build. */
export function localCacheRestoreKeys(
  triple: string,
  version: string,
): string[] {
  return [`setup-zig-local-cache-${triple}-${version}-`];
}

/** Zig global cache directory for the current platform. */
export function getZigGlobalCacheDir(): string {
  const env = process.env.ZIG_GLOBAL_CACHE_DIR;
  if (env) {
    return env;
  }
  if (process.platform === "win32") {
    const localAppData =
      process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "zig");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Caches", "zig");
  }
  const cacheHome =
    process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), ".cache");
  return path.join(cacheHome, "zig");
}

/** Zig project-local cache directory (`.zig-cache` under a project root). */
export function getZigLocalCacheDir(projectDir: string): string {
  return path.join(projectDir, ".zig-cache");
}

export async function restoreCache(
  paths: string[],
  key: string,
  restoreKeys?: string[],
): Promise<string | undefined> {
  core.info(`Attempting to restore cache with key '${key}'`);
  return cache.restoreCache(paths, key, restoreKeys);
}

export async function saveCache(paths: string[], key: string): Promise<void> {
  core.info(`Saving cache with key '${key}'`);
  await cache.saveCache(paths, key);
}
