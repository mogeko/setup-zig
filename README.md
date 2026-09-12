# setup-zig

Install the [Zig](https://ziglang.org/) toolchain on a GitHub Actions runner, and add `zig` to `PATH`.

## 用法

```yaml
- uses: mogeko/setup-zig@v1
  with:
    version: 0.16.0

- run: zig version
```

When `version` is not specified, it will try the following in order:

1. Read the `minimum_zig_version` in `build.zig.zon` (supports recursively searching subdirectories)
2. Fall back to the latest stable version

## 输入

| Input | Default value | Description |
|------|--------|------|
| `version` | Auto-detect | Zig version, such as `0.16.0` or `master` |
| `cache` | `binary` | `binary` only caches the toolchain; `all` additionally caches Zig global/project compilation caches; `false` disables caching |

## Output

| Output | Description |
|------|------|
| `version` | The actual installed version |
| `path` | The directory containing the `zig` executable |
| `cache-hit` | Whether the toolchain hit the cache |

## 开发

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build    # Produce dist/index.js and dist/post.js, both of which must be submitted together.
```
