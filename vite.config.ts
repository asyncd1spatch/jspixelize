import { writeFileSync } from "node:fs";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/jspixelize/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "esnext",
    minify: "esbuild",
  },
  plugins: [
    {
      name: "create-nojekyll",
      closeBundle() {
        writeFileSync("dist/.nojekyll", "");
      },
    },
  ],
});
