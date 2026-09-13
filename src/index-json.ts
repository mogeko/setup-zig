/**
 * Types and helpers for the canonical Zig download index:
 * https://ziglang.org/download/index.json
 */

export const ZIG_INDEX_URL = "https://ziglang.org/download/index.json";

export interface ZigDownloadFile {
  tarball: string;
  shasum: string;
  size?: string;
}

export interface ZigRelease {
  version?: string;
  date?: string;
  docs?: string;
  stdDocs?: string;
  [target: string]: ZigDownloadFile | string | undefined;
}

export type ZigIndex = Record<string, ZigRelease>;

export interface ResolvedVersion {
  /** Key in the download index (e.g. "master" or "0.14.0"). */
  key: string;
  /** Concrete version string used for tool-cache and outputs. */
  version: string;
}

export async function fetchIndex(
  url: string = ZIG_INDEX_URL,
): Promise<ZigIndex> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Zig download index: ${response.status} ${response.statusText}`,
    );
  }
  return (await response.json()) as ZigIndex;
}

export function resolveVersion(
  requested: string,
  index: ZigIndex,
): ResolvedVersion {
  let key: string;
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

  const version = key === "master" ? (index.master?.version ?? "master") : key;
  return { key, version };
}

/**
 * Matches a partial version such as "0.16" or "0.16.x" to the highest
 * available "0.16.*" release in the index.
 */
function matchVersionPrefix(prefix: string, index: ZigIndex): string {
  const normalized = prefix.replace(/[.xX*]+$/, "");
  const candidates = Object.keys(index).filter(
    (key) =>
      key !== "master" && isSemver(key) && key.startsWith(`${normalized}.`),
  );
  if (candidates.length === 0) {
    throw new Error(
      `Zig version "${prefix}" is not available. Recent versions: ${listVersions(index)}`,
    );
  }
  return candidates.reduce((a, b) => (compareSemver(a, b) > 0 ? a : b));
}

export function latestStable(index: ZigIndex): string {
  const versions = Object.keys(index).filter(
    (key) => key !== "master" && isSemver(key),
  );
  if (versions.length === 0) {
    throw new Error("No stable Zig versions found in the download index");
  }
  return versions.reduce((a, b) => (compareSemver(a, b) > 0 ? a : b));
}

export function getDownloadFile(
  index: ZigIndex,
  versionKey: string,
  triple: string,
): ZigDownloadFile {
  const entry = index[versionKey];
  if (!entry) {
    throw new Error(
      `No entry for Zig version "${versionKey}" in the download index`,
    );
  }
  const file = entry[triple];
  if (!file || typeof file === "string") {
    throw new Error(
      `Zig version "${versionKey}" has no download for target "${triple}"`,
    );
  }
  return file;
}

function listVersions(index: ZigIndex): string {
  return Object.keys(index)
    .filter((key) => key !== "master" && isSemver(key))
    .sort(compareSemver)
    .slice(-10)
    .join(", ");
}

function isSemver(value: string): boolean {
  return /^\d+\.\d+\.\d+/.test(value);
}

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((part) => Number.parseInt(part, 10));
  const pb = b.split(".").map((part) => Number.parseInt(part, 10));
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) {
      return da - db;
    }
  }
  return 0;
}
