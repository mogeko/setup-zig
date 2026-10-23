import {
  warning,
  info,
  getState,
  globalCacheKey,
  localCacheKey,
  getRunIdentity,
  getZigGlobalCacheDir,
  getZigLocalCacheDir,
  saveCache,
  parseCacheSizeLimit,
  dirSize,
  clearDir
} from "./chunk-s2gajng4.js";

// src/post.ts
import { existsSync } from "node:fs";
async function run() {
  try {
    if (getState("setup-zig-cache-mode") !== "all") {
      return;
    }
    const triple = getState("setup-zig-triple");
    const version = getState("setup-zig-version");
    const buildHash = getState("setup-zig-build-hash");
    const projectRoot = getState("setup-zig-project-root") || process.cwd();
    const extraCacheKey = getState("setup-zig-cache-key");
    const sizeLimitMib = parseCacheSizeLimit(getState("setup-zig-cache-size-limit"));
    const { runId, runAttempt } = getRunIdentity();
    await saveIfExists(getZigGlobalCacheDir(), globalCacheKey(triple, version, extraCacheKey, runId, runAttempt), sizeLimitMib);
    await saveIfExists(getZigLocalCacheDir(projectRoot), localCacheKey(triple, version, buildHash, extraCacheKey), sizeLimitMib);
  } catch (error) {
    warning(error instanceof Error ? error.message : String(error));
  }
}
async function saveIfExists(dir, key, sizeLimitMib) {
  if (!existsSync(dir)) {
    info(`Skipping cache save: ${dir} does not exist`);
    return;
  }
  try {
    if (sizeLimitMib > 0) {
      const size = await dirSize(dir);
      const limit = sizeLimitMib * 1024 * 1024;
      if (size > limit) {
        info(`Cache directory '${dir}' is ${(size / 1024 / 1024).toFixed(1)} MiB, ` + `exceeding the ${sizeLimitMib} MiB limit; clearing it before saving`);
        await clearDir(dir);
      }
    }
    await saveCache([dir], key);
  } catch (error) {
    warning(`Failed to save cache '${key}': ${error instanceof Error ? error.message : String(error)}`);
  }
}
run();
export {
  run
};
