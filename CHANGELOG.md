# fluent-effect

## 0.1.0

### Minor Changes

- 13551ce: Add `runOrThrow`, `runResult`, and sync/app variants for converting typed task failures into normal JavaScript boundary behavior without manually unwrapping Effect `Either` values.

### Patch Changes

- a438009: Build the exported `fluent-effect/effect` subpath so package consumers can import Effect through the published package exports.
- a3dbea0: Add discard traversal helpers for sequential, unbounded, and bounded concurrency.
- 2ad3e31: Support runtime discoverability for `fx.errors` when callers provide an explicit spec object.
- 88437b2: Allow empty tagged error constructors from `fx.errors` to be called without a fields object.
- ee84a71: Handle empty and factor-only retry options as retry options with zero retries instead of misclassifying them as Effect schedules.
- c06bec2: Add focused behavior documentation for concurrency, retry and timeout semantics, dependencies, errors, and package exports.
- 5826883: Treat `provideDependency` implementations as plain values so services can intentionally use Effects as dependency values. Use `provideDependencyTask` for task-built implementations.
- c47e020: Move TypeScript from peer dependencies to development dependencies so consumers are not required to satisfy a compiler peer for the runtime package.
- d2b60a5: Add packed-package smoke coverage for the published root and `fluent-effect/effect` exports across ESM and CJS consumers.
- 1bb0c3b: Allow app dependency environments to carry remaining layer requirements through provide.
- aac3858: Support symbol-keyed dependency maps in getDependencies.
- aa9d611: Validate bounded concurrency limits and throw a RangeError for non-positive, non-finite, or fractional values.
