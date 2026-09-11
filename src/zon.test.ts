import { describe, expect, it } from "vitest";
import { extractMinimumZigVersion } from "./zon";

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
