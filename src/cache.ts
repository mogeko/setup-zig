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

/**
 * Sanitizes the user-provided `cache-key` input so it is safe to embed in a
 * cache key. An empty component becomes `default`, which keeps caches created
 * with and without the input in separate namespaces.
 */
function extraKeySegment(extra?: string): string {
  const sanitized = (extra ?? "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .slice(0, 100);
  return sanitized.length > 0 ? sanitized : "default";
}

/** Cache key for the downloaded Zig archive (platform + version). */
export function tarballCacheKey(triple: string, version: string): string {
  return `setup-zig-tarball-${triple}-${version}`;
}

/**
 * Restore-key prefix for the Zig global compile cache.
 *
 * The global cache keeps growing as builds run, but GitHub Actions caches are
 * immutable: a key can only be written once. The cache is therefore saved
 * under a per-run key and restored through this prefix.
 */
export function globalCacheRestoreKeys(
  triple: string,
  version: string,
  extra?: string,
): string[] {
  return [
    `setup-zig-global-cache-${triple}-${version}-${extraKeySegment(extra)}-`,
  ];
}

/** Cache key for the Zig global compile cache (unique per run attempt). */
export function globalCacheKey(
  triple: string,
  version: string,
  extra: string | undefined,
  runId: string,
  runAttempt: string,
): string {
  return `${globalCacheRestoreKeys(triple, version, extra)[0]}${runId}-${runAttempt}`;
}

/** Cache key for the project-local Zig cache (`.zig-cache`). */
export function localCacheKey(
  triple: string,
  version: string,
  buildHash: string,
  extra?: string,
): string {
  const prefix = localCacheRestoreKeys(triple, version, extra)[0];
  return `${prefix}${buildHash}`;
}

/** Restore-key prefix for the local cache, falling back to any build. */
export function localCacheRestoreKeys(
  triple: string,
  version: string,
  extra?: string,
): string[] {
  return [
    `setup-zig-local-cache-${triple}-${version}-${extraKeySegment(extra)}-`,
  ];
}

/** Identifies the current workflow run, used to make saved keys unique. */
export function getRunIdentity(): { runId: string; runAttempt: string } {
  return {
    runId: process.env.GITHUB_RUN_ID || "0",
    runAttempt: process.env.GITHUB_RUN_ATTEMPT || "1",
  };
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
  // Zig uses the XDG cache location on all Unix-like systems, including macOS.
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
