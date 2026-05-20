# Package Exports

The package exposes one house API entrypoint and one native Effect passthrough.

## Compatibility Matrix

| Area                   | Support                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package manager        | Bun is the supported package manager for this repository. Consumers can install with `bun add fluent-effect effect`.                                          |
| Effect peer dependency | Consumers must install `effect` alongside `fluent-effect`. The package declares `effect` as `^3.21.0` and tests against the repository-pinned Effect version. |
| TypeScript             | TypeScript 5 is the supported compiler line for local type checking and generated declarations.                                                               |
| Root export            | `fluent-effect` provides ESM, CommonJS, and TypeScript declaration targets.                                                                                   |
| Native Effect export   | `fluent-effect/effect` provides ESM, CommonJS, and TypeScript declaration targets and re-exports native `effect`.                                             |
| Runtime assumptions    | Development, tests, packaging, and examples are Bun-based. Package smoke tests verify both entrypoints from ESM and CommonJS consumers.                       |

## `fluent-effect`

Import `fx` and public helper types from the package root.

```ts
import { fx } from "fluent-effect";
import type { Task, ErrorOf, ErrorsOf } from "fluent-effect";
```

The root entrypoint exports the `fx` namespace, selected native values such as
`Cause`, `Exit`, and `pipe`, and the public task and error types. Prefer this
entrypoint for application code.

The package root is available as ESM, CommonJS, and TypeScript declarations via
`package.json` exports:

- `dist/index.mjs`
- `dist/index.js`
- `dist/index.d.ts`

## `fluent-effect/effect`

Import from `fluent-effect/effect` when code needs native Effect modules that
the house API does not wrap.

```ts
import { Effect, Schedule, Duration, Layer } from "fluent-effect/effect";
```

This entrypoint is a direct passthrough export of `effect`. It is available as
ESM, CommonJS, and TypeScript declarations via `package.json` exports:

- `dist/effect.mjs`
- `dist/effect.js`
- `dist/effect.d.ts`

## Stability Expectations

Application code should prefer `fluent-effect` for the documented house
semantics. Use `fluent-effect/effect` as an escape hatch when native Effect
surface area is required.

## Verification

Default local tests run fast package metadata checks with `bun test`. Full
packaging verification, including building a temporary package workspace,
packing it, installing it into a temporary consumer, and checking ESM and
CommonJS resolution, is available with:

```sh
bun run test:package
```
