import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
  it("finds build.zig.zon in a parent directory", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "setup-zig-test-"));
    try {
      await writeFile(
        path.join(tmp, "build.zig.zon"),
        '.{ .minimum_zig_version = "0.16.0" }',
      );
      const sub = path.join(tmp, "examples", "hello");
      await mkdir(sub, { recursive: true });
      expect(await readMinimumZigVersion(sub)).toBe("0.16.0");
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("prefers the nearest build.zig.zon", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "setup-zig-test-"));
    try {
      await writeFile(
        path.join(tmp, "build.zig.zon"),
        '.{ .minimum_zig_version = "0.14.0" }',
      );
      const sub = path.join(tmp, "examples", "hello");
      await mkdir(sub, { recursive: true });
      await writeFile(
        path.join(sub, "build.zig.zon"),
        '.{ .minimum_zig_version = "0.16.0" }',
      );
      expect(await readMinimumZigVersion(sub)).toBe("0.16.0");
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("returns undefined when no build.zig.zon exists", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "setup-zig-test-"));
    try {
      const sub = path.join(tmp, "examples", "hello");
      await mkdir(sub, { recursive: true });
      expect(await readMinimumZigVersion(sub)).toBeUndefined();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
