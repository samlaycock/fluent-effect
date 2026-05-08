import { $ } from "bun";
import { describe, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("package exports", () => {
  test("fluent-effect/effect resolves against the built package", async () => {
    await $`bun run build`.quiet();

    const consumerDirectory = await mkdtemp(join(tmpdir(), "fluent-effect-consumer-"));

    try {
      await mkdir(join(consumerDirectory, "node_modules"), { recursive: true });
      await symlink(process.cwd(), join(consumerDirectory, "node_modules", "fluent-effect"));
      await writeFile(
        join(consumerDirectory, "smoke.mjs"),
        [
          'import { Effect } from "fluent-effect/effect";',
          "if (typeof Effect.succeed !== 'function') {",
          "  throw new Error('Effect export did not resolve');",
          "}",
        ].join("\n"),
      );

      await $`bun smoke.mjs`.cwd(consumerDirectory).quiet();
    } finally {
      await rm(consumerDirectory, { recursive: true, force: true });
    }
  });
});
