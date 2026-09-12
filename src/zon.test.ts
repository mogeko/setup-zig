import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractMinimumZigVersion, readMinimumZigVersion } from "./zon";

describe("extractMinimumZigVersion", () => {
  it("extracts a quoted minimum_zig_version", () => {
    const zon = `.{
  .name = "foo",
  .minimum_zig_version = "0.14.0",
}`;
    expect(extractMinimumZigVersion(zon)).toBe("0.14.0");
  });

  it("returns undefined when the field is absent", () => {
    expect(extractMinimumZigVersion('.{ .name = "foo" }')).toBeUndefined();
  });
});

describe("readMinimumZigVersion", () => {
  it("finds build.zig.zon in a subdirectory", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "setup-zig-test-"));
    try {
      await mkdir(path.join(tmp, "examples", "hello"), { recursive: true });
      await writeFile(
        path.join(tmp, "examples", "hello", "build.zig.zon"),
        '.{ .minimum_zig_version = "0.16.0" }',
      );
      expect(await readMinimumZigVersion(tmp)).toBe("0.16.0");
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("prefers the root build.zig.zon over subdirectories", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "setup-zig-test-"));
    try {
      await writeFile(
        path.join(tmp, "build.zig.zon"),
        '.{ .minimum_zig_version = "0.14.0" }',
      );
      await mkdir(path.join(tmp, "sub"), { recursive: true });
      await writeFile(
        path.join(tmp, "sub", "build.zig.zon"),
        '.{ .minimum_zig_version = "0.16.0" }',
      );
      expect(await readMinimumZigVersion(tmp)).toBe("0.14.0");
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("returns undefined when no build.zig.zon exists", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "setup-zig-test-"));
    try {
      expect(await readMinimumZigVersion(tmp)).toBeUndefined();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
