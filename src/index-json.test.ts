import { describe, expect, it } from "@rstest/core";
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
