import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defineConfig } from "tsdown";

const ensureEffectFacadeSourcemap = async (
  outDir: string,
  extension: "js" | "mjs",
): Promise<void> => {
  const outputFile = join(outDir, `effect.${extension}`);
  const mapFile = `${outputFile}.map`;
  const output = await readFile(outputFile, "utf8");
  const source = await readFile(join("src", "effect.ts"), "utf8");
  const mappingComment = `//# sourceMappingURL=effect.${extension}.map`;

  if (!output.includes(mappingComment)) {
    await writeFile(outputFile, `${output}\n${mappingComment}\n`);
  }

  await writeFile(
    mapFile,
    `${JSON.stringify({
      version: 3,
      file: `effect.${extension}`,
      sources: ["../src/effect.ts"],
      sourcesContent: [source],
      names: [],
      mappings: "",
    })}\n`,
  );
};

export default defineConfig({
  entry: ["./src/index.ts", "./src/effect.ts"],
  format: ["cjs", "esm"],
  platform: "neutral",
  dts: true,
  sourcemap: true,
  outDir: "./dist",
  hooks: {
    "build:done": async ({ options }) => {
      await ensureEffectFacadeSourcemap(options.outDir, options.format === "cjs" ? "js" : "mjs");
    },
  },
});
