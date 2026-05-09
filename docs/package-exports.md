# Package Exports

The package exposes one house API entrypoint and one native Effect passthrough.

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
