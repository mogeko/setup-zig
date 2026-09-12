import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("@rspack/core").Configuration} */
export default {
  mode: "production",
  target: "node",
  entry: {
    index: "./src/index.ts",
    post: "./src/post.ts",
  },
  experiments: {
    outputModule: true,
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    module: true,
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: { syntax: "typescript" },
            },
          },
        },
        type: "javascript/auto",
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
    // Prefer ESM builds of dependencies so they can be tree-shaken
    // (e.g. @azure/storage-blob ships CJS as `main` and ESM as `module`).
    mainFields: ["module", "main"],
    alias: {
      // Optional dependency of the `debug` package; stub it out to silence the
      // "Can't resolve 'supports-color'" build warning.
      "supports-color": false,
    },
  },
  optimization: {
    // Keep the output readable (no minification), but drop dead code.
    minimize: false,
    sideEffects: true,
    usedExports: true,
    providedExports: true,
    innerGraph: true,
    mangleExports: false,
  },
};
