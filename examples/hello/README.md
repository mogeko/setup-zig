# hello

Example project demonstrating `setup-zig` automatically detecting the minimum Zig version from `build.zig.zon` and installing it.

## Build and run

```sh
zig build run
# Hello from Zig!
```

## Notes

- The `build.zig.zon` declares `minimum_zig_version = "0.16.0"`; the action installs it when `version` is not specified and the working directory is inside this project.
- Lives under `examples/hello/`, so CI passes `version: 0.16.0` explicitly — the action only searches upward from the workspace root, never down into subdirectories (matching Zig's own lookup order).
