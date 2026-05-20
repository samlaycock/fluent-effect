import { describe, expect, test } from "bun:test";
import { join } from "node:path";

describe("package exports", () => {
  test("package metadata declares modules as side-effect free", async () => {
    const repositoryDirectory = join(import.meta.dir, "..");
    const packageJson = await Bun.file(join(repositoryDirectory, "package.json")).json();

    expect(packageJson.sideEffects).toBe(false);
  });

  test("package metadata declares root and effect entrypoints", async () => {
    const repositoryDirectory = join(import.meta.dir, "..");
    const packageJson = await Bun.file(join(repositoryDirectory, "package.json")).json();

    expect(packageJson.main).toBe("dist/index.js");
    expect(packageJson.module).toBe("dist/index.mjs");
    expect(packageJson.types).toBe("dist/index.d.ts");
    expect(packageJson.exports).toEqual({
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.mjs",
        require: "./dist/index.js",
      },
      "./effect": {
        types: "./dist/effect.d.ts",
        import: "./dist/effect.mjs",
        require: "./dist/effect.js",
      },
    });
  });
});
