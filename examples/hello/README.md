# hello

Example project demonstrating `setup-zig` automatically detecting the

## 运行

```sh
zig build run
# Hello from Zig!
```

## 说明

- When `minimum_zig_version = "0.16.0"` is declared in `build.zig.zon`, the action automatically installs the corresponding version when `version` is not specified.
- Located in the `examples/hello/` subdirectory, used to verify the ability to recursively search for `build.zig.zon`.
