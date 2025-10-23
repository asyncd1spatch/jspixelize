import { copyFile, rm } from "node:fs/promises";
import path from "node:path";

console.log("Starting build...");

const distDir = "dist";
const srcDir = "src";
const indexFileName = "index.html";
const cssFileName = "style.css";

await rm(distDir, { recursive: true, force: true });
console.log(`Cleaned directory: ${distDir}`);

await Bun.build({
  entrypoints: [`${srcDir}/main.ts`],
  format: "esm",
  outdir: distDir,
  minify: true,
  sourcemap: "none",
});

await copyFile(
  path.join(srcDir, indexFileName),
  path.join(distDir, indexFileName),
);
await copyFile(
  path.join(srcDir, cssFileName),
  path.join(distDir, cssFileName),
);

console.log("Build complete.");
