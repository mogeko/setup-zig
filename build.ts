await Bun.build({
  entrypoints: ["./src/index.ts", "./src/post.ts"],
  target: "node",
  outdir: "./dist",
  splitting: true,
  format: "esm",
});
