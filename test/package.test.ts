import { $ } from "bun";
import { describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("package exports", () => {
  test("published root and effect exports resolve for ESM and CJS consumers", async () => {
    await $`bun run build`.quiet();

    const consumerDirectory = await mkdtemp(join(tmpdir(), "fluent-effect-consumer-"));
    const packageDirectory = await mkdtemp(join(tmpdir(), "fluent-effect-package-"));

    try {
      await $`bun pm pack --destination ${packageDirectory} --quiet`.quiet();
      const tarballName = (await readdir(packageDirectory)).find((file) => file.endsWith(".tgz"));

      if (tarballName === undefined) {
        throw new Error("Package tarball was not created");
      }

      const tarballPath = join(packageDirectory, tarballName);

      await writeFile(
        join(consumerDirectory, "package.json"),
        JSON.stringify(
          {
            private: true,
            dependencies: {
              effect: "3.21.2",
              "fluent-effect": `file:${tarballPath}`,
            },
          },
          null,
          2,
        ),
      );
      await $`bun install --quiet`.cwd(consumerDirectory).quiet();
      await writeFile(
        join(consumerDirectory, "smoke.mjs"),
        [
          'import { fx } from "fluent-effect";',
          'import { Effect } from "fluent-effect/effect";',
          "if (typeof fx.ok !== 'function') {",
          "  throw new Error('Root ESM export did not resolve');",
          "}",
          "if (typeof Effect.succeed !== 'function') {",
          "  throw new Error('Effect ESM export did not resolve');",
          "}",
        ].join("\n"),
      );
      await writeFile(
        join(consumerDirectory, "smoke.cjs"),
        [
          'const { fx } = require("fluent-effect");',
          'const { Effect } = require("fluent-effect/effect");',
          "if (typeof fx.ok !== 'function') {",
          "  throw new Error('Root CJS export did not resolve');",
          "}",
          "if (typeof Effect.succeed !== 'function') {",
          "  throw new Error('Effect CJS export did not resolve');",
          "}",
        ].join("\n"),
      );

      await $`bun smoke.mjs`.cwd(consumerDirectory).quiet();
      await $`bun smoke.cjs`.cwd(consumerDirectory).quiet();

      expect(
        await Bun.file(
          join(consumerDirectory, "node_modules", "fluent-effect", "dist", "effect.mjs"),
        ).exists(),
      ).toBe(true);
    } finally {
      await rm(consumerDirectory, { recursive: true, force: true });
      await rm(packageDirectory, { recursive: true, force: true });
    }
  });
});
