import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, rs } from "@rstest/core";
import { getZigGlobalCacheDir } from "./cache";

const originalPlatform = process.platform;

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", { value: platform });
}

beforeEach(() => {
  rs.unstubAllEnvs();
});

afterEach(() => {
  rs.unstubAllEnvs();
  rs.restoreAllMocks();
  Object.defineProperty(process, "platform", { value: originalPlatform });
});

describe("getZigGlobalCacheDir", () => {
  it("honors ZIG_GLOBAL_CACHE_DIR", () => {
    rs.stubEnv("ZIG_GLOBAL_CACHE_DIR", "/custom/zig");
    expect(getZigGlobalCacheDir()).toBe("/custom/zig");
  });

  it("uses ~/.cache/zig on macOS", () => {
    setPlatform("darwin");
    rs.spyOn(os, "homedir").mockReturnValue("/Users/runner");
    expect(getZigGlobalCacheDir()).toBe("/Users/runner/.cache/zig");
  });

  it("uses XDG_CACHE_HOME when set", () => {
    setPlatform("linux");
    rs.stubEnv("XDG_CACHE_HOME", "/xdg/cache");
    expect(getZigGlobalCacheDir()).toBe("/xdg/cache/zig");
  });

  it("uses LOCALAPPDATA on Windows", () => {
    setPlatform("win32");
    rs.spyOn(os, "homedir").mockReturnValue("C:\\Users\\runner");
    rs.stubEnv("LOCALAPPDATA", "C:\\Users\\runner\\AppData\\Local");
    expect(getZigGlobalCacheDir()).toBe(
      path.join("C:\\Users\\runner\\AppData\\Local", "zig"),
    );
  });
});
