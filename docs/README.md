# Behavior Notes

These notes document the semantic choices that `fluent-effect` layers on top of
Effect. Use them when changing public helpers or reviewing API behavior.

## Topics

- [Concurrency](./concurrency.md) covers sequential defaults, unbounded
  concurrency, bounded concurrency, and discard traversal helpers.
- [Retry and Timeout](./retry-timeout.md) covers retry attempt counting,
  backoff options, native schedules, and timeout failure behavior.
- [Dependencies](./dependencies.md) covers dependency tags, lookup helpers,
  provider helpers, layer composition, and runtime application wiring.
- [Errors](./errors.md) covers tagged error constructors, runtime
  discoverability, recovery helpers, and boundary conversion helpers.
- [Package Exports](./package-exports.md) covers the package entrypoints and
  import guarantees.
