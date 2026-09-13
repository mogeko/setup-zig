import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  addPath,
  getInput,
  info,
  saveState,
  setFailed,
  setOutput,
} from "@actions/core";
import { exec } from "@actions/exec";
import {
  cacheDir,
  downloadTool,
  extractTar,
  extractZip,
  find,
} from "@actions/tool-cache";
import {
  getZigGlobalCacheDir,
  getZigLocalCacheDir,
  globalCacheKey,
  localCacheKey,
  localCacheRestoreKeys,
  parseCacheMode,
  restoreCache,
  saveCache,
  tarballCacheKey,
} from "./cache";
import { hashBuildInputs } from "./hash";
import { fetchIndex, getDownloadFile, resolveVersion } from "./index-json";
import { verifyMinisign } from "./minisign";
import { getZigTarget } from "./platform";
import { findProjectRoot } from "./projects";
import { readMinimumZigVersion } from "./zon";

export async function run(): Promise<void> {
  try {
    const requestedVersion = getInput("version");
    const cacheMode = parseCacheMode(getInput("cache"));
    const workdir = process.cwd();
    const { triple, ext } = getZigTarget();

    const index = await fetchIndex();

    const zonVersion = await readMinimumZigVersion(workdir);
    const requested = requestedVersion || zonVersion || "latest";
    if (!requestedVersion) {
      info(
        zonVersion
          ? `No version input; detected "${zonVersion}" from build.zig.zon`
          : 'No version input and no build.zig.zon found; falling back to "latest"',
      );
    }
    const resolved = resolveVersion(requested, index);
    info(`Installing Zig ${resolved.version}`);

    const download = getDownloadFile(index, resolved.key, triple);

    let cacheHit = false;
    let installDir: string;

    if (cacheMode === "false") {
      info(`Downloading Zig ${resolved.version} from ${download.tarball}`);
      const archive = await downloadTool(download.tarball);
      await verifyTarball(archive, download);
      const extracted =
        ext === "zip"
          ? await extractZip(archive)
          : await extractTar(archive, undefined, "xJ");
      installDir = await findZigRoot(extracted);
    } else {
      installDir = find("zig", resolved.version, process.arch);
      if (installDir) {
        cacheHit = true;
        info(`Found Zig ${resolved.version} in tool cache`);
      } else {
        const tarballPath = path.join(
          process.env.RUNNER_TEMP ?? os.tmpdir(),
          `zig-${triple}-${resolved.version}.${ext}`,
        );
        const tarballKey = tarballCacheKey(triple, resolved.version);
        const restoredKey = await restoreCache([tarballPath], tarballKey);
        if (restoredKey) {
          cacheHit = true;
          info(`Restored Zig tarball from cache (${restoredKey})`);
        } else {
          info(`Downloading Zig ${resolved.version} from ${download.tarball}`);
          await downloadTool(download.tarball, tarballPath);
        }

        // Verify the tarball whether it was downloaded or restored from cache.
        await verifyTarball(tarballPath, download);

        if (!restoredKey) {
          await saveCache([tarballPath], tarballKey);
        }
        const extracted =
          ext === "zip"
            ? await extractZip(tarballPath)
            : await extractTar(tarballPath, undefined, "xJ");
        const root = await findZigRoot(extracted);
        installDir = await cacheDir(
          root,
          "zig",
          resolved.version,
          process.arch,
        );
      }
    }

    if (cacheMode === "all") {
      const projectRoot = (await findProjectRoot(workdir)) ?? workdir;
      const buildHash = await hashBuildInputs(projectRoot);
      await restoreCache(
        [getZigGlobalCacheDir()],
        globalCacheKey(triple, resolved.version),
      );
      await restoreCache(
        [getZigLocalCacheDir(projectRoot)],
        localCacheKey(triple, resolved.version, buildHash),
        localCacheRestoreKeys(triple, resolved.version),
      );

      saveState("setup-zig-cache-mode", cacheMode);
      saveState("setup-zig-triple", triple);
      saveState("setup-zig-version", resolved.version);
      saveState("setup-zig-build-hash", buildHash);
      saveState("setup-zig-project-root", projectRoot);
    }

    addPath(installDir);
    info(`Added ${installDir} to PATH`);

    const zig = process.platform === "win32" ? "zig.exe" : "zig";
    await exec(path.join(installDir, zig), ["version"]);

    setOutput("version", resolved.version);
    setOutput("path", installDir);
    setOutput("cache-hit", cacheHit.toString());
  } catch (error) {
    setFailed(error instanceof Error ? error : String(error));
  }
}

async function verifyTarball(
  file: string,
  download: { tarball: string; shasum: string },
): Promise<void> {
  await verifySha256(file, download.shasum);

  info("Verifying tarball signature with minisign");
  const response = await fetch(`${download.tarball}.minisig`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch minisign signature: ${response.status} ${response.statusText}`,
    );
  }
  await verifyMinisign(file, await response.text());
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
  const [dir] = dirs;
  if (dir !== undefined && dirs.length === 1) {
    return path.join(extracted, dir.name);
  }
  const zigName = process.platform === "win32" ? "zig.exe" : "zig";
  if (entries.some((entry) => entry.isFile() && entry.name === zigName)) {
    return extracted;
  }
  throw new Error(
    `Unexpected archive layout: ${entries.map((entry) => entry.name).join(", ")}`,
  );
}
