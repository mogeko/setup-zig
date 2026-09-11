import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("@rspack/core").Configuration} */
export default {
  mode: "production",
  target: "node",
  entry: "./src/index.ts",
  experiments: {
    outputModule: true,
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
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
  },
  optimization: {
    minimize: false,
  },
};
