import { describe, expect, it } from "bun:test";
import { getZigTarget } from "./platform";

describe("getZigTarget", () => {
  it("maps linux x64", () => {
    expect(getZigTarget("linux", "x64")).toEqual({
      triple: "x86_64-linux",
      ext: "tar.xz",
    });
  });

  it("maps darwin arm64", () => {
    expect(getZigTarget("darwin", "arm64")).toEqual({
      triple: "aarch64-macos",
      ext: "tar.xz",
    });
  });

  it("maps win32 x64 to a zip archive", () => {
    expect(getZigTarget("win32", "x64")).toEqual({
      triple: "x86_64-windows",
      ext: "zip",
    });
  });

  it("throws on an unsupported platform", () => {
    expect(() => getZigTarget("freebsd", "x64")).toThrow(
      /Unsupported platform/,
    );
  });

  it("throws on an unsupported architecture", () => {
    expect(() => getZigTarget("linux", "riscv64")).toThrow(
      /Unsupported architecture/,
    );
  });
});
