const result = await Bun.build({
  entrypoints: ["./src/index.ts", "./src/post.ts"],
  target: "node",
  outdir: "./dist",
  splitting: true,
  format: "esm",
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

export {};
