import { existsSync } from "node:fs";
import * as core from "@actions/core";
import {
  getRunIdentity,
  getZigGlobalCacheDir,
  getZigLocalCacheDir,
  globalCacheKey,
  localCacheKey,
  saveCache,
} from "./cache";
import { clearDir, dirSize, parseCacheSizeLimit } from "./cache-size";

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
    const extraCacheKey = core.getState("setup-zig-cache-key");
    const sizeLimitMib = parseCacheSizeLimit(
      core.getState("setup-zig-cache-size-limit"),
    );
    const { runId, runAttempt } = getRunIdentity();

    await saveIfExists(
      getZigGlobalCacheDir(),
      globalCacheKey(triple, version, extraCacheKey, runId, runAttempt),
      sizeLimitMib,
    );
    await saveIfExists(
      getZigLocalCacheDir(projectRoot),
      localCacheKey(triple, version, buildHash, extraCacheKey),
      sizeLimitMib,
    );
  } catch (error) {
    core.warning(error instanceof Error ? error.message : String(error));
  }
}

async function saveIfExists(
  dir: string,
  key: string,
  sizeLimitMib: number,
): Promise<void> {
  if (!existsSync(dir)) {
    core.info(`Skipping cache save: ${dir} does not exist`);
    return;
  }
  try {
    if (sizeLimitMib > 0) {
      const size = await dirSize(dir);
      const limit = sizeLimitMib * 1024 * 1024;
      if (size > limit) {
        core.info(
          `Cache directory '${dir}' is ${(size / 1024 / 1024).toFixed(1)} MiB, ` +
            `exceeding the ${sizeLimitMib} MiB limit; clearing it before saving`,
        );
        await clearDir(dir);
      }
    }
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
