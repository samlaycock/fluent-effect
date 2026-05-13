import { $ } from "bun";
import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const repositoryDirectory = join(import.meta.dir, "..");
const examplesDirectory = join(repositoryDirectory, "examples");

const exampleFiles = readdirSync(examplesDirectory)
  .filter((file) => file.endsWith(".ts"))
  .sort();

describe("examples smoke tests", () => {
  expect(exampleFiles.length).toBeGreaterThan(0);

  for (const exampleFile of exampleFiles) {
    test(`${exampleFile} executes with Bun`, async () => {
      await $`bun ${join(examplesDirectory, exampleFile)}`.cwd(repositoryDirectory).quiet();
    });
  }
});
