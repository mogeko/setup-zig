import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hashBuildInputs } from "./hash";

async function makeFixture(): Promise<string> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "setup-zig-hash-"));
  await mkdir(path.join(tmp, "src"), { recursive: true });
  await writeFile(
    path.join(tmp, "build.zig.zon"),
    '.{ .name = .hello, .minimum_zig_version = "0.16.0" }\n',
  );
  await writeFile(
    path.join(tmp, "src", "main.zig"),
    'const std = @import("std");\npub fn main() void {}\n',
  );
  return tmp;
}

describe("hashBuildInputs", () => {
  it("is stable for identical sources", async () => {
    const a = await makeFixture();
    const b = await makeFixture();
    try {
      expect(await hashBuildInputs(a)).toBe(await hashBuildInputs(b));
    } finally {
      await rm(a, { recursive: true, force: true });
      await rm(b, { recursive: true, force: true });
    }
  });

  it("changes when a source file changes", async () => {
    const tmp = await makeFixture();
    try {
      const before = await hashBuildInputs(tmp);
      await writeFile(
        path.join(tmp, "src", "main.zig"),
        "pub fn main() void {}\n",
      );
      expect(await hashBuildInputs(tmp)).not.toBe(before);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("ignores build output directories", async () => {
    const tmp = await makeFixture();
    try {
      const before = await hashBuildInputs(tmp);
      await mkdir(path.join(tmp, "zig-out"), { recursive: true });
      await writeFile(path.join(tmp, "zig-out", "artifact"), "junk");
      expect(await hashBuildInputs(tmp)).toBe(before);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
