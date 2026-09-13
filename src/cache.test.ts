import { afterEach, describe, expect, it, jest, spyOn } from "bun:test";
import os from "node:os";
import path from "node:path";
import { getZigGlobalCacheDir } from "./cache";

const originalPlatform = process.platform;
const originalEnv = new Map<string, string | undefined>();

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", { value: platform });
}

function setEnv(name: string, value: string): void {
  originalEnv.set(name, process.env[name]);
  process.env[name] = value;
}

afterEach(() => {
  for (const [name, original] of originalEnv) {
    if (original === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = original;
    }
  }
  originalEnv.clear();
  jest.restoreAllMocks();
  Object.defineProperty(process, "platform", { value: originalPlatform });
});

describe("getZigGlobalCacheDir", () => {
  it("honors ZIG_GLOBAL_CACHE_DIR", () => {
    setEnv("ZIG_GLOBAL_CACHE_DIR", "/custom/zig");
    expect(getZigGlobalCacheDir()).toBe("/custom/zig");
  });

  it("uses ~/.cache/zig on macOS", () => {
    setPlatform("darwin");
    spyOn(os, "homedir").mockReturnValue("/Users/runner");
    expect(getZigGlobalCacheDir()).toBe("/Users/runner/.cache/zig");
  });

  it("uses XDG_CACHE_HOME when set", () => {
    setPlatform("linux");
    setEnv("XDG_CACHE_HOME", "/xdg/cache");
    expect(getZigGlobalCacheDir()).toBe("/xdg/cache/zig");
  });

  it("uses LOCALAPPDATA on Windows", () => {
    setPlatform("win32");
    spyOn(os, "homedir").mockReturnValue("C:\\Users\\runner");
    setEnv("LOCALAPPDATA", "C:\\Users\\runner\\AppData\\Local");
    expect(getZigGlobalCacheDir()).toBe(
      path.join("C:\\Users\\runner\\AppData\\Local", "zig"),
    );
  });
});
