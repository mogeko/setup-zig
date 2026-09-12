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
    const projectRoot =
      core.getState("setup-zig-project-root") || process.cwd();

    await saveIfExists(getZigGlobalCacheDir(), globalCacheKey(triple, version));
    await saveIfExists(
      getZigLocalCacheDir(projectRoot),
      localCacheKey(triple, version, buildHash),
    );
  } catch (error) {
    core.warning(error instanceof Error ? error.message : String(error));
  }
}

async function saveIfExists(dir: string, key: string): Promise<void> {
  if (!existsSync(dir)) {
    core.info(`Skipping cache save: ${dir} does not exist`);
    return;
  }
  try {
    await saveCache([dir], key);
  } catch (error) {
    core.warning(
      `Failed to save cache '${key}': ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

run();
