import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "./src/effect.ts"],
  format: ["cjs", "esm"],
  platform: "neutral",
  dts: true,
  sourcemap: true,
  outDir: "./dist",
});
