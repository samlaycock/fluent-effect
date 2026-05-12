# Documentation

`fluent-effect` is an ergonomic TypeScript API over Effect. These docs explain
the public package surface, the intended usage path, and the semantic choices
that differ from raw Effect defaults.

## Start Here

- [Core Concepts](./concepts.md) explains tasks, typed failures, generator
  syntax, dependency environments, and the native Effect escape hatch.
- [Runtime Boundaries](./runtime.md) explains when to use `run`, `runOrThrow`,
  `runResult`, `runExit`, `runWith`, `app`, and sync runners.
- [API Reference](./api-reference.md) lists exported `fx` helpers and public
  types.

## Behavior Guides

- [Errors](./errors.md) covers tagged error constructors, runtime
  discoverability, recovery helpers, and boundary conversion helpers.
- [Dependencies](./dependencies.md) covers dependency tags, lookup helpers,
  provider helpers, layer composition, and runtime application wiring.
- [Concurrency](./concurrency.md) covers sequential defaults, unbounded
  concurrency, bounded concurrency, and discard traversal helpers.
- [Resource Safety](./resources.md) covers acquire/use/release workflows and
  when to use the native Effect escape hatch.
- [Retry and Timeout](./retry-timeout.md) covers retry attempt counting,
  backoff options, native schedules, and timeout failure behavior.
- [Package Exports](./package-exports.md) covers the package entrypoints and
  import guarantees.
