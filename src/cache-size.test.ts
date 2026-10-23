import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  clearDir,
  DEFAULT_CACHE_SIZE_LIMIT_MIB,
  dirSize,
  parseCacheSizeLimit,
} from "./cache-size";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "setup-zig-cache-size-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("parseCacheSizeLimit", () => {
  it("defaults to the built-in limit for an empty input", () => {
    expect(parseCacheSizeLimit("")).toBe(DEFAULT_CACHE_SIZE_LIMIT_MIB);
    expect(parseCacheSizeLimit("   ")).toBe(DEFAULT_CACHE_SIZE_LIMIT_MIB);
  });

  it("accepts non-negative integers", () => {
    expect(parseCacheSizeLimit("512")).toBe(512);
    expect(parseCacheSizeLimit("0")).toBe(0);
  });

  it("rejects malformed values", () => {
    expect(() => parseCacheSizeLimit("2GiB")).toThrow(/cache-size-limit/);
    expect(() => parseCacheSizeLimit("-1")).toThrow(/cache-size-limit/);
    expect(() => parseCacheSizeLimit("1.5")).toThrow(/cache-size-limit/);
  });
});

describe("dirSize", () => {
  it("sums files recursively and ignores missing directories", async () => {
    const dir = await makeTempDir();
    await writeFile(path.join(dir, "a.bin"), Buffer.alloc(100));
    await mkdir(path.join(dir, "nested"));
    await writeFile(path.join(dir, "nested", "b.bin"), Buffer.alloc(250));

    expect(await dirSize(dir)).toBe(350);
    expect(await dirSize(path.join(dir, "missing"))).toBe(0);
  });
});

describe("clearDir", () => {
  it("removes the contents but keeps the directory", async () => {
    const dir = await makeTempDir();
    await writeFile(path.join(dir, "a.bin"), "a");
    await mkdir(path.join(dir, "nested"));
    await writeFile(path.join(dir, "nested", "b.bin"), "b");

    await clearDir(dir);

    expect(await readdir(dir)).toEqual([]);
  });

  it("does nothing for a missing directory", async () => {
    await expect(
      clearDir("/does/not/exist/setup-zig"),
    ).resolves.toBeUndefined();
  });
});
