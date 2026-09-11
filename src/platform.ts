/**
 * Maps the current GitHub Actions runner platform/arch to a Zig download target.
 * The target names are the keys of https://ziglang.org/download/index.json.
 */

export interface ZigTarget {
  /** Key in the Zig download index (e.g. "x86_64-linux"). */
  triple: string;
  /** Archive extension for this platform: "tar.xz" on Unix, "zip" on Windows. */
  ext: "tar.xz" | "zip";
}

const TRIPLES: Record<string, Record<string, string>> = {
  linux: {
    x64: "x86_64-linux",
    arm64: "aarch64-linux",
  },
  darwin: {
    x64: "x86_64-macos",
    arm64: "aarch64-macos",
  },
  win32: {
    x64: "x86_64-windows",
    arm64: "aarch64-windows",
  },
};

export function getZigTarget(
  platform: string = process.platform,
  arch: string = process.arch,
): ZigTarget {
  const byArch = TRIPLES[platform];
  if (!byArch) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  const triple = byArch[arch];
  if (!triple) {
    throw new Error(`Unsupported architecture: ${arch} on ${platform}`);
  }
  return {
    triple,
    ext: platform === "win32" ? "zip" : "tar.xz",
  };
}
