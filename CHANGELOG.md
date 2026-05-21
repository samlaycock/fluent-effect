# fluent-effect

## 0.3.0

### Minor Changes

- 3459176: Add `fx.eachBatch` for sequential batch traversal with per-batch concurrency options and synchronous batch-size validation.
- 7165fbe: Add `fx.runWithOrThrow` and `fx.runWithResult` one-shot dependency runtime helpers that unwrap dependency layer acquisition failures consistently with `fx.app` boundary helpers.
- 9b724e5: Add `fx.acquireRelease`, `fx.scoped`, and `fx.layerScoped` for ergonomic scoped resource workflows.
- ee7b163: Add `fx.timeoutOption` for timeout-as-value workflows.

### Patch Changes

- 0096311: Define `fx.app` lifecycle behavior after disposal, making disposal idempotent and failing later app usage with a clear error.
- 3a8de6d: Align `fx.error` empty-field constructors with `fx.errors` so `{}` field shapes can be called without an argument.
- 0005cd2: Reduce allocations in `fx.getDependencies` by building dependency lookup results in a single pass.
- 37123f2: Split the package smoke test into a dedicated `test:package` script while keeping fast package export metadata checks in the default test suite.
- 4661fc3: Reject `fx.retry` options that provide `factor` without `backoff`, preventing factor-only retry policies from silently retrying zero times.
- 75cd538: Document package manager, Effect peer dependency, TypeScript, module format, and runtime support expectations.

## 0.2.0

### Minor Changes

- 15213a2: Add `fx.acquireUseRelease` and `fx.bracket` for resource-safe acquire/use/release workflows.

### Patch Changes

- 0f23744: Isolate package export smoke tests from the repository `dist` directory so concurrent typecheck runs cannot observe a partially rebuilt package output.
- d742499: Document logging and tracing helpers, including structured log metadata and span attributes.
- 9130dd6: Add interruption regression tests for collection helper cancellation semantics.
- 4c44614: Declare the package as side-effect free so consumer bundlers can tree-shake unused modules more effectively.
- 4de756d: Publish source maps with the built package.
- 41b8cc6: Fix `fx.withDependency` so direct dependency values of `undefined` are provided with `Effect.provideService` instead of being mistaken for the layer overload.
- e6376d7: Reuse `fx.app` dependency environments across repeated app runs and expose
  `app.dispose()` for releasing scoped layer resources.
- 09854aa: Add runnable Bun smoke coverage for every TypeScript example.
- 2188ee7: Validate retry attempt counts before constructing retry schedules.

## 0.1.1

### Patch Changes

- 3106e3f: Improve public package documentation with install guidance, quickstart examples, core concepts, runtime boundary guidance, and an API reference.

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
