import {
  warning,
  info,
  getState,
  globalCacheKey,
  localCacheKey,
  getZigGlobalCacheDir,
  getZigLocalCacheDir,
  saveCache
} from "./chunk-qxqvqpzh.js";

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
    await saveIfExists(getZigGlobalCacheDir(), globalCacheKey(triple, version));
    await saveIfExists(getZigLocalCacheDir(projectRoot), localCacheKey(triple, version, buildHash));
  } catch (error) {
    warning(error instanceof Error ? error.message : String(error));
  }
}
async function saveIfExists(dir, key) {
  if (!existsSync(dir)) {
    info(`Skipping cache save: ${dir} does not exist`);
    return;
  }
  try {
    await saveCache([dir], key);
  } catch (error) {
    warning(`Failed to save cache '${key}': ${error instanceof Error ? error.message : String(error)}`);
  }
}
run();
export {
  run
};
