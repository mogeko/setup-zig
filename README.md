# setup-zig

Install the [Zig](https://ziglang.org/) toolchain on a GitHub Actions runner, and add `zig` to `PATH`.

## Usage

```yaml
- uses: mogeko/setup-zig@v1
  with:
    version: 0.16.0

- run: zig version
```

When `version` is not specified, it will try the following in order:

1. Read the `minimum_zig_version` in `build.zig.zon`, walking up from the working directory through its parent directories (matching Zig's own lookup order)
2. Fall back to the latest stable version

## Inputs

| Input | Default value | Description |
|------|--------|------|
| `version` | Auto-detect | Exact (`0.16.0`), partial (`0.16` → latest `0.16.x`), `master`, or `latest` |
| `cache` | `binary` | `binary` only caches the toolchain; `all` additionally caches Zig global/project compilation caches; `false` disables caching |
| `cache-key` | – | Extra component for the compile cache keys, e.g. `${{ matrix.target }}`, to keep matrix jobs in separate caches |
| `cache-size-limit` | `2048` | Maximum size of each compile cache directory in MiB; a directory over the limit is cleared before saving. `0` disables the limit |

## Caching

With `cache: all`, both the Zig global cache (including the compiled build
system that Zig 0.17 builds on first use) and the project-local `.zig-cache`
are cached.

The global cache is shared between runs and keeps growing, so it is saved under
a per-run key and restored through a prefix. The project-local cache is keyed
by a hash of the build inputs (`build.zig`, `build.zig.zon` and `*.zig`).

The keys cover the runner OS and architecture, the resolved Zig version, the
`cache-key` input and the workflow run. They deliberately do not include CPU
model, target or build flags: Zig's cache is content-addressed and its internal
hashes already cover the resolved target (including CPU features), optimize
mode, linker inputs and so on, so entries can never be reused incorrectly.
Passing those dimensions through `cache-key` only splits the cache into
smaller, less reusable pieces.

## Output

| Output | Description |
|------|------|
| `version` | The actual installed version |
| `path` | The directory containing the `zig` executable |
| `cache-hit` | Whether the toolchain hit the cache |

## Development

```sh
bun install
bun run typecheck
bun run test
bun run build    # Produce dist/index.js and dist/post.js, both of which must be committed together.
```
