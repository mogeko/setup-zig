import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";
import {
  compileCacheKey,
  getZigGlobalCacheDir,
  parseCacheMode,
  restoreCache,
  saveCache,
  tarballCacheKey,
} from "./cache";
import { fetchIndex, getDownloadFile, resolveVersion } from "./index-json";
import { getZigTarget } from "./platform";
import { readMinimumZigVersion } from "./zon";

export async function run(): Promise<void> {
  try {
    const requestedVersion = core.getInput("version");
    const cacheMode = parseCacheMode(core.getInput("cache"));
    const { triple, ext } = getZigTarget();

    const index = await fetchIndex();

    const requested =
      requestedVersion ||
      (await readMinimumZigVersion(process.cwd())) ||
      "latest";
    if (!requestedVersion) {
      core.info(
        `No version input; resolved "${requested}" from build.zig.zon or fallback`,
      );
    }
    const resolved = resolveVersion(requested, index);
    core.info(`Installing Zig ${resolved.version}`);

    const download = getDownloadFile(index, resolved.key, triple);

    let cacheHit = false;
    let installDir: string;

    if (cacheMode === "false") {
      core.info(`Downloading Zig ${resolved.version} from ${download.tarball}`);
      const archive = await tc.downloadTool(download.tarball);
      await verifySha256(archive, download.shasum);
      const extracted =
        ext === "zip"
          ? await tc.extractZip(archive)
          : await tc.extractTar(archive, undefined, "xJ");
      installDir = await findZigRoot(extracted);
    } else {
      installDir = tc.find("zig", resolved.version, process.arch);
      if (installDir) {
        cacheHit = true;
        core.info(`Found Zig ${resolved.version} in tool cache`);
      } else {
        const tarballPath = path.join(
          process.env.RUNNER_TEMP ?? os.tmpdir(),
          `zig-${triple}-${resolved.version}.${ext}`,
        );
        const tarballKey = tarballCacheKey(triple, resolved.version);
        const restoredKey = await restoreCache([tarballPath], tarballKey);
        if (restoredKey) {
          cacheHit = true;
          core.info(`Restored Zig tarball from cache (${restoredKey})`);
        } else {
          core.info(
            `Downloading Zig ${resolved.version} from ${download.tarball}`,
          );
          await tc.downloadTool(download.tarball, tarballPath);
          await verifySha256(tarballPath, download.shasum);
          await saveCache([tarballPath], tarballKey);
        }
        const extracted =
          ext === "zip"
            ? await tc.extractZip(tarballPath)
            : await tc.extractTar(tarballPath, undefined, "xJ");
        const root = await findZigRoot(extracted);
        installDir = await tc.cacheDir(
          root,
          "zig",
          resolved.version,
          process.arch,
        );
      }
    }

    if (cacheMode === "all") {
      const compileDir = getZigGlobalCacheDir();
      await restoreCache(
        [compileDir],
        compileCacheKey(triple, resolved.version),
      );
    }

    core.addPath(installDir);
    core.info(`Added ${installDir} to PATH`);

    const zig = process.platform === "win32" ? "zig.exe" : "zig";
    await exec.exec(path.join(installDir, zig), ["version"]);

    core.setOutput("version", resolved.version);
    core.setOutput("path", installDir);
    core.setOutput("cache-hit", cacheHit.toString());

    if (cacheMode === "all") {
      const compileDir = getZigGlobalCacheDir();
      if (existsSync(compileDir)) {
        await saveCache(
          [compileDir],
          compileCacheKey(triple, resolved.version),
        );
      }
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error : String(error));
  }
}

async function verifySha256(file: string, expected: string): Promise<void> {
  const hash = createHash("sha256");
  await pipeline(createReadStream(file), hash);
  const actual = hash.digest("hex");
  if (actual !== expected) {
    throw new Error(`Checksum mismatch: expected ${expected}, got ${actual}`);
  }
}

async function findZigRoot(extracted: string): Promise<string> {
  const entries = await readdir(extracted, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory());
  if (dirs.length === 1) {
    return path.join(extracted, dirs[0].name);
  }
  const zigName = process.platform === "win32" ? "zig.exe" : "zig";
  if (entries.some((entry) => entry.isFile() && entry.name === zigName)) {
    return extracted;
  }
  throw new Error(
    `Unexpected archive layout: ${entries.map((entry) => entry.name).join(", ")}`,
  );
}
