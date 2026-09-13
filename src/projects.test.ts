import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { findProjectRoot } from "./projects";

describe("findProjectRoot", () => {
  it("returns the directory itself when build.zig is present", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "setup-zig-test-"));
    try {
      await writeFile(path.join(tmp, "build.zig"), "// root");
      expect(await findProjectRoot(tmp)).toBe(tmp);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("finds build.zig in a parent directory", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "setup-zig-test-"));
    try {
      await writeFile(path.join(tmp, "build.zig"), "// root");
      const sub = path.join(tmp, "examples", "hello");
      await mkdir(sub, { recursive: true });
      expect(await findProjectRoot(sub)).toBe(tmp);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("returns undefined when no build.zig exists", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "setup-zig-test-"));
    try {
      const sub = path.join(tmp, "examples", "hello");
      await mkdir(sub, { recursive: true });
      expect(await findProjectRoot(sub)).toBeUndefined();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
