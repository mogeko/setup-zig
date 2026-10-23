import { afterEach, describe, expect, it, jest, spyOn } from "bun:test";
import os from "node:os";
import path from "node:path";
import {
  getRunIdentity,
  getZigGlobalCacheDir,
  globalCacheKey,
  globalCacheRestoreKeys,
  localCacheKey,
  localCacheRestoreKeys,
} from "./cache";

const originalPlatform = process.platform;
const originalEnv = new Map<string, string | undefined>();

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", { value: platform });
}

function setEnv(name: string, value: string): void {
  originalEnv.set(name, process.env[name]);
  process.env[name] = value;
}

function deleteEnv(name: string): void {
  originalEnv.set(name, process.env[name]);
  delete process.env[name];
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

describe("globalCacheKey", () => {
  it("includes platform, version, extra key and run identity", () => {
    expect(
      globalCacheKey("x86_64-linux", "0.17.0", "x86_64_v3", "123", "2"),
    ).toBe("setup-zig-global-cache-x86_64-linux-0.17.0-x86_64_v3-123-2");
  });

  it("uses a stable segment when no extra key is provided", () => {
    expect(globalCacheKey("aarch64-macos", "0.17.0", "", "1", "1")).toBe(
      "setup-zig-global-cache-aarch64-macos-0.17.0-default-1-1",
    );
    expect(globalCacheKey("aarch64-macos", "0.17.0", undefined, "1", "1")).toBe(
      "setup-zig-global-cache-aarch64-macos-0.17.0-default-1-1",
    );
  });

  it("sanitizes the extra key", () => {
    expect(
      globalCacheKey("x86_64-linux", "0.17.0", " my target/1 ", "1", "1"),
    ).toBe("setup-zig-global-cache-x86_64-linux-0.17.0-my_target_1-1-1");
  });

  it("restores through a prefix that never matches another extra key", () => {
    expect(globalCacheRestoreKeys("x86_64-linux", "0.17.0", "debug")).toEqual([
      "setup-zig-global-cache-x86_64-linux-0.17.0-debug-",
    ]);
    expect(globalCacheRestoreKeys("x86_64-linux", "0.17.0")).toEqual([
      "setup-zig-global-cache-x86_64-linux-0.17.0-default-",
    ]);
  });
});

describe("localCacheKey", () => {
  it("includes the build hash after the extra key", () => {
    expect(
      localCacheKey("x86_64-linux", "0.17.0", "abcdef123456", "debug"),
    ).toBe("setup-zig-local-cache-x86_64-linux-0.17.0-debug-abcdef123456");
  });

  it("restores through the matching prefix", () => {
    expect(localCacheRestoreKeys("x86_64-linux", "0.17.0", "debug")).toEqual([
      "setup-zig-local-cache-x86_64-linux-0.17.0-debug-",
    ]);
    expect(localCacheRestoreKeys("x86_64-linux", "0.17.0")).toEqual([
      "setup-zig-local-cache-x86_64-linux-0.17.0-default-",
    ]);
  });
});

describe("getRunIdentity", () => {
  it("reads the workflow run identity", () => {
    setEnv("GITHUB_RUN_ID", "42");
    setEnv("GITHUB_RUN_ATTEMPT", "3");
    expect(getRunIdentity()).toEqual({ runId: "42", runAttempt: "3" });
  });

  it("falls back when the variables are absent", () => {
    deleteEnv("GITHUB_RUN_ID");
    deleteEnv("GITHUB_RUN_ATTEMPT");
    expect(getRunIdentity()).toEqual({ runId: "0", runAttempt: "1" });
  });
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
