# hello

Example project demonstrating `setup-zig` automatically detecting the minimum Zig version from `build.zig.zon` and installing it.

## Build and run

```sh
zig build run
# Hello from Zig!
```

## Notes

- The `build.zig.zon` declares `minimum_zig_version = "0.16.0"`; the action installs it when `version` is not specified and the working directory is inside this project.
- The action searches upward for `build.zig.zon`/`build.zig` (matching Zig's own lookup order) and never descends into subdirectories. Since this example lives under `examples/hello/`, the CI workflow moves it to the workspace root before invoking the action, so auto-detection and the `.zig-cache` save both work.
