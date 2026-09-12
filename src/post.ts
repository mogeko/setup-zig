import { existsSync } from "node:fs";
import * as core from "@actions/core";
import {
  getZigGlobalCacheDir,
  getZigLocalCacheDir,
  globalCacheKey,
  localCacheKey,
  saveCache,
} from "./cache";

/**
 * Post step: runs after the workflow's build steps to persist the Zig compile
 * caches (global + project-local). Best-effort — failures only warn.
 */
export async function run(): Promise<void> {
  try {
    if (core.getState("setup-zig-cache-mode") !== "all") {
      return;
    }

    const triple = core.getState("setup-zig-triple");
    const version = core.getState("setup-zig-version");
    const buildHash = core.getState("setup-zig-build-hash");

    const targets = [
      { dir: getZigGlobalCacheDir(), key: globalCacheKey(triple, version) },
      {
        dir: getZigLocalCacheDir(process.cwd()),
        key: localCacheKey(triple, version, buildHash),
      },
    ];

    for (const { dir, key } of targets) {
      if (existsSync(dir)) {
        await saveCache([dir], key);
      } else {
        core.info(`Skipping cache save: ${dir} does not exist`);
      }
    }
  } catch (error) {
    core.warning(error instanceof Error ? error.message : String(error));
  }
}

run();
