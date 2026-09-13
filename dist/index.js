import {
  __toESM,
  HttpClient,
  cp,
  rmRF,
  mkdirP,
  which,
  exec,
  addPath,
  getInput,
  setOutput,
  setFailed,
  isDebug,
  debug,
  info,
  saveState,
  require_semver,
  parseCacheMode,
  tarballCacheKey,
  globalCacheKey,
  localCacheKey,
  localCacheRestoreKeys,
  getZigGlobalCacheDir,
  getZigLocalCacheDir,
  restoreCache,
  saveCache
} from "./chunk-qxqvqpzh.js";

// src/main.ts
import { createHash as createHash3 } from "node:crypto";
import { createReadStream as createReadStream2 } from "node:fs";
import { readdir as readdir3 } from "node:fs/promises";
import os2 from "node:os";
import path5 from "node:path";
import { pipeline as pipeline3 } from "node:stream/promises";

// node_modules/@actions/tool-cache/lib/tool-cache.js
import * as crypto from "crypto";
import * as fs from "fs";

// node_modules/@actions/tool-cache/lib/manifest.js
var semver = __toESM(require_semver(), 1);

// node_modules/@actions/tool-cache/lib/tool-cache.js
import * as os from "os";
import * as path from "path";
var semver2 = __toESM(require_semver(), 1);
import * as stream from "stream";
import * as util from "util";
import { ok } from "assert";

// node_modules/@actions/tool-cache/lib/retry-helper.js
var __awaiter = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

class RetryHelper {
  constructor(maxAttempts, minSeconds, maxSeconds) {
    if (maxAttempts < 1) {
      throw new Error("max attempts should be greater than or equal to 1");
    }
    this.maxAttempts = maxAttempts;
    this.minSeconds = Math.floor(minSeconds);
    this.maxSeconds = Math.floor(maxSeconds);
    if (this.minSeconds > this.maxSeconds) {
      throw new Error("min seconds should be less than or equal to max seconds");
    }
  }
  execute(action, isRetryable) {
    return __awaiter(this, undefined, undefined, function* () {
      let attempt = 1;
      while (attempt < this.maxAttempts) {
        try {
          return yield action();
        } catch (err) {
          if (isRetryable && !isRetryable(err)) {
            throw err;
          }
          info(err.message);
        }
        const seconds = this.getSleepAmount();
        info(`Waiting ${seconds} seconds before trying again`);
        yield this.sleep(seconds);
        attempt++;
      }
      return yield action();
    });
  }
  getSleepAmount() {
    return Math.floor(Math.random() * (this.maxSeconds - this.minSeconds + 1)) + this.minSeconds;
  }
  sleep(seconds) {
    return __awaiter(this, undefined, undefined, function* () {
      return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    });
  }
}

// node_modules/@actions/tool-cache/lib/tool-cache.js
var __dirname = "/Users/mogeko/Workspace/setup-zig/node_modules/@actions/tool-cache/lib";
var __awaiter2 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

class HTTPError extends Error {
  constructor(httpStatusCode) {
    super(`Unexpected HTTP response: ${httpStatusCode}`);
    this.httpStatusCode = httpStatusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
var IS_WINDOWS = process.platform === "win32";
var IS_MAC = process.platform === "darwin";
var userAgent = "actions/tool-cache";
function downloadTool(url, dest, auth, headers) {
  return __awaiter2(this, undefined, undefined, function* () {
    dest = dest || path.join(_getTempDirectory(), crypto.randomUUID());
    yield mkdirP(path.dirname(dest));
    debug(`Downloading ${url}`);
    debug(`Destination ${dest}`);
    const maxAttempts = 3;
    const minSeconds = _getGlobal("TEST_DOWNLOAD_TOOL_RETRY_MIN_SECONDS", 10);
    const maxSeconds = _getGlobal("TEST_DOWNLOAD_TOOL_RETRY_MAX_SECONDS", 20);
    const retryHelper = new RetryHelper(maxAttempts, minSeconds, maxSeconds);
    return yield retryHelper.execute(() => __awaiter2(this, undefined, undefined, function* () {
      return yield downloadToolAttempt(url, dest || "", auth, headers);
    }), (err) => {
      if (err instanceof HTTPError && err.httpStatusCode) {
        if (err.httpStatusCode < 500 && err.httpStatusCode !== 408 && err.httpStatusCode !== 429) {
          return false;
        }
      }
      return true;
    });
  });
}
function downloadToolAttempt(url, dest, auth, headers) {
  return __awaiter2(this, undefined, undefined, function* () {
    if (fs.existsSync(dest)) {
      throw new Error(`Destination file path ${dest} already exists`);
    }
    const http = new HttpClient(userAgent, [], {
      allowRetries: false
    });
    if (auth) {
      debug("set auth");
      if (headers === undefined) {
        headers = {};
      }
      headers.authorization = auth;
    }
    const response = yield http.get(url, headers);
    if (response.message.statusCode !== 200) {
      const err = new HTTPError(response.message.statusCode);
      debug(`Failed to download from "${url}". Code(${response.message.statusCode}) Message(${response.message.statusMessage})`);
      throw err;
    }
    const pipeline2 = util.promisify(stream.pipeline);
    const responseMessageFactory = _getGlobal("TEST_DOWNLOAD_TOOL_RESPONSE_MESSAGE_FACTORY", () => response.message);
    const readStream = responseMessageFactory();
    let succeeded = false;
    try {
      yield pipeline2(readStream, fs.createWriteStream(dest));
      debug("download complete");
      succeeded = true;
      return dest;
    } finally {
      if (!succeeded) {
        debug("download failed");
        try {
          yield rmRF(dest);
        } catch (err) {
          debug(`Failed to delete '${dest}'. ${err.message}`);
        }
      }
    }
  });
}
function extractTar(file_1, dest_1) {
  return __awaiter2(this, arguments, undefined, function* (file, dest, flags = "xz") {
    if (!file) {
      throw new Error("parameter 'file' is required");
    }
    dest = yield _createExtractFolder(dest);
    debug("Checking tar --version");
    let versionOutput = "";
    yield exec("tar --version", [], {
      ignoreReturnCode: true,
      silent: true,
      listeners: {
        stdout: (data) => versionOutput += data.toString(),
        stderr: (data) => versionOutput += data.toString()
      }
    });
    debug(versionOutput.trim());
    const isGnuTar = versionOutput.toUpperCase().includes("GNU TAR");
    let args;
    if (flags instanceof Array) {
      args = flags;
    } else {
      args = [flags];
    }
    if (isDebug() && !flags.includes("v")) {
      args.push("-v");
    }
    let destArg = dest;
    let fileArg = file;
    if (IS_WINDOWS && isGnuTar) {
      args.push("--force-local");
      destArg = dest.replace(/\\/g, "/");
      fileArg = file.replace(/\\/g, "/");
    }
    if (isGnuTar) {
      args.push("--warning=no-unknown-keyword");
      args.push("--overwrite");
    }
    args.push("-C", destArg, "-f", fileArg);
    yield exec(`tar`, args);
    return dest;
  });
}
function extractZip(file, dest) {
  return __awaiter2(this, undefined, undefined, function* () {
    if (!file) {
      throw new Error("parameter 'file' is required");
    }
    dest = yield _createExtractFolder(dest);
    if (IS_WINDOWS) {
      yield extractZipWin(file, dest);
    } else {
      yield extractZipNix(file, dest);
    }
    return dest;
  });
}
function extractZipWin(file, dest) {
  return __awaiter2(this, undefined, undefined, function* () {
    const escapedFile = file.replace(/'/g, "''").replace(/"|\n|\r/g, "");
    const escapedDest = dest.replace(/'/g, "''").replace(/"|\n|\r/g, "");
    const pwshPath = yield which("pwsh", false);
    if (pwshPath) {
      const pwshCommand = [
        `$ErrorActionPreference = 'Stop' ;`,
        `try { Add-Type -AssemblyName System.IO.Compression.ZipFile } catch { } ;`,
        `try { [System.IO.Compression.ZipFile]::ExtractToDirectory('${escapedFile}', '${escapedDest}', $true) }`,
        `catch { if (($_.Exception.GetType().FullName -eq 'System.Management.Automation.MethodException') -or ($_.Exception.GetType().FullName -eq 'System.Management.Automation.RuntimeException') ){ Expand-Archive -LiteralPath '${escapedFile}' -DestinationPath '${escapedDest}' -Force } else { throw $_ } } ;`
      ].join(" ");
      const args = [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Unrestricted",
        "-Command",
        pwshCommand
      ];
      debug(`Using pwsh at path: ${pwshPath}`);
      yield exec(`"${pwshPath}"`, args);
    } else {
      const powershellCommand = [
        `$ErrorActionPreference = 'Stop' ;`,
        `try { Add-Type -AssemblyName System.IO.Compression.FileSystem } catch { } ;`,
        `if ((Get-Command -Name Expand-Archive -Module Microsoft.PowerShell.Archive -ErrorAction Ignore)) { Expand-Archive -LiteralPath '${escapedFile}' -DestinationPath '${escapedDest}' -Force }`,
        `else {[System.IO.Compression.ZipFile]::ExtractToDirectory('${escapedFile}', '${escapedDest}', $true) }`
      ].join(" ");
      const args = [
        "-NoLogo",
        "-Sta",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Unrestricted",
        "-Command",
        powershellCommand
      ];
      const powershellPath = yield which("powershell", true);
      debug(`Using powershell at path: ${powershellPath}`);
      yield exec(`"${powershellPath}"`, args);
    }
  });
}
function extractZipNix(file, dest) {
  return __awaiter2(this, undefined, undefined, function* () {
    const unzipPath = yield which("unzip", true);
    const args = [file];
    if (!isDebug()) {
      args.unshift("-q");
    }
    args.unshift("-o");
    yield exec(`"${unzipPath}"`, args, { cwd: dest });
  });
}
function cacheDir(sourceDir, tool, version, arch2) {
  return __awaiter2(this, undefined, undefined, function* () {
    version = semver2.clean(version) || version;
    arch2 = arch2 || os.arch();
    debug(`Caching tool ${tool} ${version} ${arch2}`);
    debug(`source dir: ${sourceDir}`);
    if (!fs.statSync(sourceDir).isDirectory()) {
      throw new Error("sourceDir is not a directory");
    }
    const destPath = yield _createToolPath(tool, version, arch2);
    for (const itemName of fs.readdirSync(sourceDir)) {
      const s = path.join(sourceDir, itemName);
      yield cp(s, destPath, { recursive: true });
    }
    _completeToolPath(tool, version, arch2);
    return destPath;
  });
}
function find(toolName, versionSpec, arch2) {
  if (!toolName) {
    throw new Error("toolName parameter is required");
  }
  if (!versionSpec) {
    throw new Error("versionSpec parameter is required");
  }
  arch2 = arch2 || os.arch();
  if (!isExplicitVersion(versionSpec)) {
    const localVersions = findAllVersions(toolName, arch2);
    const match = evaluateVersions(localVersions, versionSpec);
    versionSpec = match;
  }
  let toolPath = "";
  if (versionSpec) {
    versionSpec = semver2.clean(versionSpec) || "";
    const cachePath = path.join(_getCacheDirectory(), toolName, versionSpec, arch2);
    debug(`checking cache: ${cachePath}`);
    if (fs.existsSync(cachePath) && fs.existsSync(`${cachePath}.complete`)) {
      debug(`Found tool in cache ${toolName} ${versionSpec} ${arch2}`);
      toolPath = cachePath;
    } else {
      debug("not found");
    }
  }
  return toolPath;
}
function findAllVersions(toolName, arch2) {
  const versions = [];
  arch2 = arch2 || os.arch();
  const toolPath = path.join(_getCacheDirectory(), toolName);
  if (fs.existsSync(toolPath)) {
    const children = fs.readdirSync(toolPath);
    for (const child of children) {
      if (isExplicitVersion(child)) {
        const fullPath = path.join(toolPath, child, arch2 || "");
        if (fs.existsSync(fullPath) && fs.existsSync(`${fullPath}.complete`)) {
          versions.push(child);
        }
      }
    }
  }
  return versions;
}
function _createExtractFolder(dest) {
  return __awaiter2(this, undefined, undefined, function* () {
    if (!dest) {
      dest = path.join(_getTempDirectory(), crypto.randomUUID());
    }
    yield mkdirP(dest);
    return dest;
  });
}
function _createToolPath(tool, version, arch) {
  return __awaiter2(this, undefined, undefined, function* () {
    const folderPath = path.join(_getCacheDirectory(), tool, semver2.clean(version) || version, arch || "");
    debug(`destination ${folderPath}`);
    const markerPath = `${folderPath}.complete`;
    yield rmRF(folderPath);
    yield rmRF(markerPath);
    yield mkdirP(folderPath);
    return folderPath;
  });
}
function _completeToolPath(tool, version, arch) {
  const folderPath = path.join(_getCacheDirectory(), tool, semver2.clean(version) || version, arch || "");
  const markerPath = `${folderPath}.complete`;
  fs.writeFileSync(markerPath, "");
  debug("finished caching tool");
}
function isExplicitVersion(versionSpec) {
  const c = semver2.clean(versionSpec) || "";
  debug(`isExplicit: ${c}`);
  const valid2 = semver2.valid(c) != null;
  debug(`explicit? ${valid2}`);
  return valid2;
}
function evaluateVersions(versions, versionSpec) {
  let version = "";
  debug(`evaluating ${versions.length} versions`);
  versions = versions.sort((a, b) => {
    if (semver2.gt(a, b)) {
      return 1;
    }
    return -1;
  });
  for (let i = versions.length - 1;i >= 0; i--) {
    const potential = versions[i];
    const satisfied = semver2.satisfies(potential, versionSpec);
    if (satisfied) {
      version = potential;
      break;
    }
  }
  if (version) {
    debug(`matched: ${version}`);
  } else {
    debug("match not found");
  }
  return version;
}
function _getCacheDirectory() {
  const cacheDirectory = process.env["RUNNER_TOOL_CACHE"] || "";
  ok(cacheDirectory, "Expected RUNNER_TOOL_CACHE to be defined");
  return cacheDirectory;
}
function _getTempDirectory() {
  const tempDirectory = process.env["RUNNER_TEMP"] || "";
  ok(tempDirectory, "Expected RUNNER_TEMP to be defined");
  return tempDirectory;
}
function _getGlobal(key, defaultValue) {
  const value = global[key];
  return value !== undefined ? value : defaultValue;
}

// src/hash.ts
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path2 from "node:path";
var SKIP_DIRS = new Set([
  "bin",
  "build",
  "dist",
  "node_modules",
  "obj",
  "target",
  "zig-cache",
  "zig-out"
]);
async function hashBuildInputs(workspace) {
  const hash = createHash("sha256");
  await walk(workspace, workspace, hash);
  return hash.digest("hex").slice(0, 12);
}
async function walk(dir, workspace, hash) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path2.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) {
        continue;
      }
      await walk(full, workspace, hash);
    } else if (entry.name === "build.zig" || entry.name.endsWith(".zig") || entry.name.endsWith(".zon")) {
      const relative = path2.relative(workspace, full);
      hash.update(relative);
      hash.update("\x00");
      hash.update(await readFile(full));
      hash.update("\x00");
    }
  }
}

// src/index-json.ts
var ZIG_INDEX_URL = "https://ziglang.org/download/index.json";
async function fetchIndex(url = ZIG_INDEX_URL) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Zig download index: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}
function resolveVersion(requested, index) {
  let key;
  if (requested === "master") {
    if (!index.master) {
      throw new Error("The Zig download index has no `master` entry");
    }
    key = "master";
  } else if (requested === "latest") {
    key = latestStable(index);
  } else if (index[requested]) {
    key = requested;
  } else {
    key = matchVersionPrefix(requested, index);
  }
  const version = key === "master" ? index.master?.version ?? "master" : key;
  return { key, version };
}
function matchVersionPrefix(prefix, index) {
  const normalized = prefix.replace(/[.xX*]+$/, "");
  const candidates = Object.keys(index).filter((key) => key !== "master" && isSemver(key) && key.startsWith(`${normalized}.`));
  if (candidates.length === 0) {
    throw new Error(`Zig version "${prefix}" is not available. Recent versions: ${listVersions(index)}`);
  }
  return candidates.reduce((a, b) => compareSemver(a, b) > 0 ? a : b);
}
function latestStable(index) {
  const versions = Object.keys(index).filter((key) => key !== "master" && isSemver(key));
  if (versions.length === 0) {
    throw new Error("No stable Zig versions found in the download index");
  }
  return versions.reduce((a, b) => compareSemver(a, b) > 0 ? a : b);
}
function getDownloadFile(index, versionKey, triple) {
  const entry = index[versionKey];
  if (!entry) {
    throw new Error(`No entry for Zig version "${versionKey}" in the download index`);
  }
  const file = entry[triple];
  if (!file || typeof file === "string") {
    throw new Error(`Zig version "${versionKey}" has no download for target "${triple}"`);
  }
  return file;
}
function listVersions(index) {
  return Object.keys(index).filter((key) => key !== "master" && isSemver(key)).sort(compareSemver).slice(-10).join(", ");
}
function isSemver(value) {
  return /^\d+\.\d+\.\d+/.test(value);
}
function compareSemver(a, b) {
  const pa = a.split(".").map((part) => Number.parseInt(part, 10));
  const pb = b.split(".").map((part) => Number.parseInt(part, 10));
  for (let i = 0;i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) {
      return da - db;
    }
  }
  return 0;
}

// src/minisign.ts
import { createHash as createHash2, createPublicKey, verify } from "node:crypto";
import { createReadStream } from "node:fs";
import { pipeline as pipeline2 } from "node:stream/promises";
var ZIG_MINISIGN_PUBLIC_KEY = "RWSGOq2NVecA2UPNdBUZykf1CCb147pkmdtYxgb3Ti+JO/wCYvhbAb/U";
var ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
async function verifyMinisign(filePath, signatureText, publicKey = ZIG_MINISIGN_PUBLIC_KEY) {
  const signature = parseSignature(signatureText);
  const algorithm = signature.subarray(0, 2).toString("ascii");
  if (algorithm !== "ED") {
    throw new Error(`Unsupported minisign signature algorithm "${algorithm}"`);
  }
  const signatureKeyId = signature.subarray(2, 10);
  const ed25519Signature = signature.subarray(10);
  const publicKeyBytes = Buffer.from(publicKey, "base64");
  const publicKeyId = publicKeyBytes.subarray(2, 10);
  const ed25519PublicKey = publicKeyBytes.subarray(10);
  if (!signatureKeyId.equals(publicKeyId)) {
    throw new Error("minisign key ID mismatch: signature was not made by Zig's public key");
  }
  const digest = await blake2b512(filePath);
  const keyObject = createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, ed25519PublicKey]),
    format: "der",
    type: "spki"
  });
  if (!verify(null, digest, keyObject, ed25519Signature)) {
    throw new Error("minisign signature verification failed");
  }
}
function parseSignature(signatureText) {
  const lines = signatureText.split(/\r?\n/);
  let encoded = "";
  let afterTrustedComment = false;
  for (const line of lines) {
    if (line.startsWith("untrusted comment:")) {
      continue;
    }
    if (line.startsWith("trusted comment:")) {
      afterTrustedComment = true;
      continue;
    }
    if (afterTrustedComment) {
      continue;
    }
    const trimmed = line.trim();
    if (trimmed) {
      encoded += trimmed;
    }
  }
  if (!encoded) {
    throw new Error("minisign signature file contains no signature");
  }
  return Buffer.from(encoded, "base64");
}
async function blake2b512(filePath) {
  const hash = createHash2("blake2b512");
  await pipeline2(createReadStream(filePath), hash);
  return hash.digest();
}

// src/platform.ts
var TRIPLES = {
  linux: {
    x64: "x86_64-linux",
    arm64: "aarch64-linux"
  },
  darwin: {
    x64: "x86_64-macos",
    arm64: "aarch64-macos"
  },
  win32: {
    x64: "x86_64-windows",
    arm64: "aarch64-windows"
  }
};
function getZigTarget(platform = process.platform, arch = process.arch) {
  const byArch = TRIPLES[platform];
  if (!byArch) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  const triple = byArch[arch];
  if (!triple) {
    throw new Error(`Unsupported architecture: ${arch} on ${platform}`);
  }
  return {
    triple,
    ext: platform === "win32" ? "zip" : "tar.xz"
  };
}

// src/projects.ts
import { readdir as readdir2 } from "node:fs/promises";
import path3 from "node:path";
async function findProjectRoot(startDir) {
  let dir = path3.resolve(startDir);
  for (;; ) {
    if (await hasBuildZig(dir)) {
      return dir;
    }
    const parent = path3.dirname(dir);
    if (parent === dir) {
      return;
    }
    dir = parent;
  }
}
async function hasBuildZig(dir) {
  try {
    const entries = await readdir2(dir, { withFileTypes: true });
    return entries.some((e) => e.isFile() && e.name === "build.zig");
  } catch {
    return false;
  }
}

// src/zon.ts
import { readFile as readFile2 } from "node:fs/promises";
import path4 from "node:path";
function extractMinimumZigVersion(zon) {
  const match = zon.match(/\.minimum_zig_version\s*=\s*"([^"]+)"/);
  return match?.[1];
}
async function readMinimumZigVersion(startDir) {
  let dir = path4.resolve(startDir);
  for (;; ) {
    const version = await tryReadMinimumZigVersion(path4.join(dir, "build.zig.zon"));
    if (version !== undefined) {
      return version;
    }
    const parent = path4.dirname(dir);
    if (parent === dir) {
      return;
    }
    dir = parent;
  }
}
async function tryReadMinimumZigVersion(zonPath) {
  try {
    const content = await readFile2(zonPath, "utf8");
    return extractMinimumZigVersion(content);
  } catch {
    return;
  }
}

// src/main.ts
async function run() {
  try {
    const requestedVersion = getInput("version");
    const cacheMode = parseCacheMode(getInput("cache"));
    const workdir = process.cwd();
    const { triple, ext } = getZigTarget();
    const index = await fetchIndex();
    const zonVersion = await readMinimumZigVersion(workdir);
    const requested = requestedVersion || zonVersion || "latest";
    if (!requestedVersion) {
      info(zonVersion ? `No version input; detected "${zonVersion}" from build.zig.zon` : 'No version input and no build.zig.zon found; falling back to "latest"');
    }
    const resolved = resolveVersion(requested, index);
    info(`Installing Zig ${resolved.version}`);
    const download = getDownloadFile(index, resolved.key, triple);
    let cacheHit = false;
    let installDir;
    if (cacheMode === "false") {
      info(`Downloading Zig ${resolved.version} from ${download.tarball}`);
      const archive = await downloadTool(download.tarball);
      await verifyTarball(archive, download);
      const extracted = ext === "zip" ? await extractZip(archive) : await extractTar(archive, undefined, "xJ");
      installDir = await findZigRoot(extracted);
    } else {
      installDir = find("zig", resolved.version, process.arch);
      if (installDir) {
        cacheHit = true;
        info(`Found Zig ${resolved.version} in tool cache`);
      } else {
        const tarballPath = path5.join(process.env.RUNNER_TEMP ?? os2.tmpdir(), `zig-${triple}-${resolved.version}.${ext}`);
        const tarballKey = tarballCacheKey(triple, resolved.version);
        const restoredKey = await restoreCache([tarballPath], tarballKey);
        if (restoredKey) {
          cacheHit = true;
          info(`Restored Zig tarball from cache (${restoredKey})`);
        } else {
          info(`Downloading Zig ${resolved.version} from ${download.tarball}`);
          await downloadTool(download.tarball, tarballPath);
        }
        await verifyTarball(tarballPath, download);
        if (!restoredKey) {
          await saveCache([tarballPath], tarballKey);
        }
        const extracted = ext === "zip" ? await extractZip(tarballPath) : await extractTar(tarballPath, undefined, "xJ");
        const root = await findZigRoot(extracted);
        installDir = await cacheDir(root, "zig", resolved.version, process.arch);
      }
    }
    if (cacheMode === "all") {
      const projectRoot = await findProjectRoot(workdir) ?? workdir;
      const buildHash = await hashBuildInputs(projectRoot);
      await restoreCache([getZigGlobalCacheDir()], globalCacheKey(triple, resolved.version));
      await restoreCache([getZigLocalCacheDir(projectRoot)], localCacheKey(triple, resolved.version, buildHash), localCacheRestoreKeys(triple, resolved.version));
      saveState("setup-zig-cache-mode", cacheMode);
      saveState("setup-zig-triple", triple);
      saveState("setup-zig-version", resolved.version);
      saveState("setup-zig-build-hash", buildHash);
      saveState("setup-zig-project-root", projectRoot);
    }
    addPath(installDir);
    info(`Added ${installDir} to PATH`);
    const zig = process.platform === "win32" ? "zig.exe" : "zig";
    await exec(path5.join(installDir, zig), ["version"]);
    setOutput("version", resolved.version);
    setOutput("path", installDir);
    setOutput("cache-hit", cacheHit.toString());
  } catch (error) {
    setFailed(error instanceof Error ? error : String(error));
  }
}
async function verifyTarball(file, download) {
  await verifySha256(file, download.shasum);
  info("Verifying tarball signature with minisign");
  const response = await fetch(`${download.tarball}.minisig`);
  if (!response.ok) {
    throw new Error(`Failed to fetch minisign signature: ${response.status} ${response.statusText}`);
  }
  await verifyMinisign(file, await response.text());
}
async function verifySha256(file, expected) {
  const hash = createHash3("sha256");
  await pipeline3(createReadStream2(file), hash);
  const actual = hash.digest("hex");
  if (actual !== expected) {
    throw new Error(`Checksum mismatch: expected ${expected}, got ${actual}`);
  }
}
async function findZigRoot(extracted) {
  const entries = await readdir3(extracted, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory());
  const [dir] = dirs;
  if (dir !== undefined && dirs.length === 1) {
    return path5.join(extracted, dir.name);
  }
  const zigName = process.platform === "win32" ? "zig.exe" : "zig";
  if (entries.some((entry) => entry.isFile() && entry.name === zigName)) {
    return extracted;
  }
  throw new Error(`Unexpected archive layout: ${entries.map((entry) => entry.name).join(", ")}`);
}

// src/index.ts
run().catch((error) => {
  setFailed(error instanceof Error ? error : String(error));
});
