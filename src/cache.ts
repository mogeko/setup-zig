import { existsSync } from "node:fs";
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

export function compileCacheKey(version: string): string {
  const osName = process.env.RUNNER_OS ?? process.platform;
  return `setup-zig-cache-${osName}-${version}`;
}

export async function restoreCompileCache(
  cacheDir: string,
  key: string,
): Promise<void> {
  core.info(`Restoring Zig global cache (${cacheDir})...`);
  await cache.restoreCache([cacheDir], key);
}

export async function saveCompileCache(
  cacheDir: string,
  key: string,
): Promise<void> {
  if (!existsSync(cacheDir)) {
    core.info(`Skipping cache save: ${cacheDir} does not exist`);
    return;
  }
  core.info(`Saving Zig global cache (${cacheDir})...`);
  await cache.saveCache([cacheDir], key);
}
