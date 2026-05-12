import { $ } from "bun";
import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const repositoryDirectory = join(import.meta.dir, "..");
const examplesDirectory = join(repositoryDirectory, "examples");

const getExampleFiles = async () =>
  (await readdir(examplesDirectory)).filter((file) => file.endsWith(".ts")).sort();

describe("examples smoke tests", () => {
  test("every TypeScript example executes with Bun", async () => {
    const exampleFiles = await getExampleFiles();

    expect(exampleFiles.length).toBeGreaterThan(0);

    for (const exampleFile of exampleFiles) {
      await $`bun ${join(examplesDirectory, exampleFile)}`.cwd(repositoryDirectory).quiet();
    }
  });
});
