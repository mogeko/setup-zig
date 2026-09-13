import { describe, expect, it } from "bun:test";
import {
  getDownloadFile,
  latestStable,
  resolveVersion,
  type ZigIndex,
} from "./index-json";

const index: ZigIndex = {
  master: { version: "0.15.0-dev.1+abc123" },
  "0.13.0": {
    "x86_64-linux": {
      tarball: "https://example.com/0.13.0.tar.xz",
      shasum: "s1",
    },
  },
  "0.14.0": {
    "x86_64-linux": {
      tarball: "https://example.com/0.14.0.tar.xz",
      shasum: "s2",
    },
  },
};

describe("resolveVersion", () => {
  it("resolves an exact version", () => {
    expect(resolveVersion("0.14.0", index)).toEqual({
      key: "0.14.0",
      version: "0.14.0",
    });
  });

  it("resolves master to its concrete dev version", () => {
    expect(resolveVersion("master", index)).toEqual({
      key: "master",
      version: "0.15.0-dev.1+abc123",
    });
  });

  it("resolves latest to the highest stable version", () => {
    expect(resolveVersion("latest", index).key).toBe("0.14.0");
  });

  it("throws on an unknown version", () => {
    expect(() => resolveVersion("9.9.9", index)).toThrow(/not available/);
  });
});

describe("latestStable", () => {
  it("returns the highest stable semver key", () => {
    expect(latestStable(index)).toBe("0.14.0");
  });
});

describe("getDownloadFile", () => {
  it("returns the download entry for the target", () => {
    expect(getDownloadFile(index, "0.14.0", "x86_64-linux").tarball).toBe(
      "https://example.com/0.14.0.tar.xz",
    );
  });

  it("throws when the target is missing", () => {
    expect(() => getDownloadFile(index, "0.14.0", "aarch64-linux")).toThrow(
      /no download/,
    );
  });
});

describe("resolveVersion with partial versions", () => {
  const partialIndex: ZigIndex = {
    "0.16.0": { "x86_64-linux": { tarball: "t0", shasum: "s0" } },
    "0.16.1": { "x86_64-linux": { tarball: "t1", shasum: "s1" } },
    "0.16.10": { "x86_64-linux": { tarball: "t10", shasum: "s10" } },
    "0.160.0": { "x86_64-linux": { tarball: "t160", shasum: "s160" } },
    "0.17.0": { "x86_64-linux": { tarball: "t17", shasum: "s17" } },
  };

  it("resolves 0.16 to the highest 0.16.x", () => {
    expect(resolveVersion("0.16", partialIndex)).toEqual({
      key: "0.16.10",
      version: "0.16.10",
    });
  });

  it("resolves 0.16.x to the highest 0.16.x", () => {
    expect(resolveVersion("0.16.x", partialIndex).key).toBe("0.16.10");
  });

  it("throws when no version matches the prefix", () => {
    expect(() => resolveVersion("0.99", partialIndex)).toThrow(/not available/);
  });
});
