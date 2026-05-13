# fluent-effect

An ergonomic TypeScript API over Effect.

`fluent-effect` keeps native Effect available, but gives application code a
smaller vocabulary for tasks, typed errors, dependencies, concurrency, and
runtime entrypoints.

## Install

```bash
bun add fluent-effect effect
```

`effect` is a peer dependency. Install it alongside `fluent-effect` so your
application and this package share the same Effect runtime.

## Quick Start

```ts
import { fx } from "fluent-effect";

const AppError = fx.errors<{
  NotFound: { id: string };
}>();

const loadUser = (id: string) =>
  fx.task(function* () {
    yield* fx.ensure(id.length > 0, () => AppError.NotFound({ id }));

    return yield* fx.require(id === "1" ? { id, name: "Ada" } : null, () =>
      AppError.NotFound({ id }),
    );
  });

const result = await fx.runResult(loadUser("1"));

if (result.ok) {
  console.log(result.value.name);
} else {
  console.error(result.error);
}
```

## Imports

Use `fluent-effect` for the house API:

```ts
import { fx } from "fluent-effect";
```

Use `fluent-effect/effect` when you need native Effect modules:

```ts
import { Effect, Schedule, Duration } from "fluent-effect/effect";
```

## Recommended API

User documentation lives in [docs/](./docs/README.md). Start with
[Core Concepts](./docs/concepts.md), then use the focused behavior pages when
you need exact semantics.

### Create Tasks

```ts
fx.task(function* () {
  const value = yield* otherTask;
  return value;
});

fx.succeed(value);

fx.try({
  try: (signal) => fetch(url, { signal }),
  catch: (cause) => AppError.NetworkError({ cause }),
});

fx.try({
  try: () => JSON.parse(input),
  catch: (cause) => AppError.ParseError({ cause }),
});

fx.fail(AppError.NotFound({ id }));
```

`fx.try` is the general boundary for code that may throw or reject. It is async-safe even when the work is synchronous.

### Typed Errors

See [docs/errors.md](./docs/errors.md) for constructor discoverability, recovery helpers, and runtime boundary behavior.

Prefer `fx.errors` for application errors. Calling a constructor creates the error instance.
Pass an explicit runtime spec when the available constructors must be discoverable with reflection
APIs such as `Object.keys`, `in`, or object spread. Without that runtime spec, TypeScript-only error
tags are erased at runtime and constructors remain lazy/direct-access only.

```ts
import type { ErrorOf, ErrorsOf } from "fluent-effect";

const AppError = fx.errors<{
  NotFound: { id: string };
  NetworkError: { cause: unknown };
}>({
  NotFound: null,
  NetworkError: null,
});

Object.keys(AppError); // ["NotFound", "NetworkError"]

type NotFound = ErrorOf<typeof AppError.NotFound>;
type AppErrors = ErrorsOf<typeof AppError>;

const loadUser = (id: string) =>
  fx.task(function* () {
    yield* fx.ensure(id.length > 0, () => AppError.NotFound({ id }));

    return yield* fx.require(id === "1" ? { id, name: "Ada" } : null, () =>
      AppError.NotFound({ id }),
    );
  });

const safeUser = fx.recoverErrors(loadUser("1"), {
  NotFound: () => fx.succeed(null),
});
```

### Dependencies

See [docs/dependencies.md](./docs/dependencies.md) for dependency tags, provider helpers, layer composition, and runtime wiring.

Define dependencies once, pull them by name inside tasks, provide implementations at the edge.
Use `provideDependency` when you already have the dependency value, even if that value is an
Effect. Use `provideDependencyTask` only when the dependency implementation must be built by
running a Task.

```ts
import type { Task } from "fluent-effect";

interface Users {
  readonly findById: (id: string) => Task<User, NotFound>;
}

interface AuditLog {
  readonly record: (message: string) => Task<void>;
}

const Users = fx.dependency<Users>("Users");
const AuditLog = fx.dependency<AuditLog>("AuditLog");

const loadUser = fx.task(function* () {
  const { users, audit } = yield* fx.getDependency({
    users: Users,
    audit: AuditLog,
  });

  yield* audit.record("Loading user");
  return yield* users.findById("1");
});

const dependencies = fx.dependencies(
  fx.provideDependency(Users, {
    findById: () => fx.succeed({ id: "1", name: "Ada" }),
  }),
  // Build this implementation from a Task at startup.
  fx.provideDependencyTask(
    AuditLog,
    fx.succeed({
      record: (message) => fx.log(message),
    }),
  ),
);

const app = fx.app(dependencies);
const main = app.run(loadUser);
```

### Concurrency

See [docs/concurrency.md](./docs/concurrency.md) for sequential defaults, unbounded concurrency, bounded concurrency, and discard traversal behavior.

Use options when execution strategy matters. The default is sequential.

```ts
fx.sequence(tasks);
fx.sequence(tasks, { concurrency: true });
fx.sequence(tasks, { concurrency: 5 });

fx.each(items, fn);
fx.each(items, fn, { concurrency: true });
fx.each(items, fn, { concurrency: 5 });

fx.eachDiscard(items, fn);
fx.eachDiscard(items, fn, { concurrency: true });
fx.eachDiscard(items, fn, { concurrency: 5 });
```

Omit `concurrency` for sequential work, use `true` to turn parallelism on without a limit, or pass a number to bound parallelism.
Use `eachDiscard` for fire-and-discard traversal over large collections when you need the effects but not the collected result array.

### Retry, Timeout, Logging, Tracing

See [docs/retry-timeout.md](./docs/retry-timeout.md) for retry attempt counting, backoff behavior, native schedules, and timeout failures.
See [docs/logging-tracing.md](./docs/logging-tracing.md) for structured log metadata, span attributes, and native Effect instrumentation boundaries.

```ts
fx.retry(task, { times: 3 });

fx.retry(task, {
  backoff: "100 millis",
  factor: 2,
  times: 5,
});

fx.timeout(task, "5 seconds", () => AppError.Timeout({ operation }));

fx.log("Loading user", { userId });

fx.trace(task, "load-user", {
  attributes: { userId },
});
```

### Runtime

See [docs/runtime.md](./docs/runtime.md) for choosing between Promise,
throwing, result-object, exit, dependency-backed, and synchronous boundaries.

```ts
fx.run(task);
fx.runOrThrow(task);
fx.runResult(task);
fx.runWith(task, dependencies);

const app = fx.app(dependencies);
app.run(task);
app.runOrThrow(task);
app.runResult(task);
app.runExit(task);
```

Use `runOrThrow` at application boundaries when typed failures should be thrown
as their original values. Use `runResult` when boundary code wants a plain
JavaScript result object instead of native Effect `Either` or `Exit` values.

## Native Escape Hatch

See [docs/package-exports.md](./docs/package-exports.md) for package entrypoints and import guarantees.

`fluent-effect/effect` is a direct passthrough:

```ts
export * from "effect";
```

Use it when the house API does not cover what you need:

```ts
import { Effect, Schedule, Layer } from "fluent-effect/effect";
```

## Examples

Focused examples live in [examples/](./examples). A useful reading order is
errors, dependencies, runtime, collections, then batch job.

```txt
examples/dependencies.ts
examples/errors.ts
examples/fallbacks.ts
examples/control-flow.ts
examples/composition.ts
examples/collections.ts
examples/batch-job.ts
examples/runtime.ts
```

See [examples/README.md](./examples/README.md) for what each example covers.

## API Reference

See [docs/api-reference.md](./docs/api-reference.md) for the exported `fx`
helpers and public types.

## Native-ish Aliases

These remain available for consistency and escape hatches, but examples prefer the clearer house names above.

Use the `Sync` variants only when you specifically need a synchronously runnable task or synchronous runtime execution.

```ts
fx.ok; // Effect.succeed
fx.sync; // Effect.sync
fx.fromSync; // Effect.sync
fx.trySync; // Effect.try, synchronously runnable throwing boundary
fx.chain; // Effect.flatMap
fx.tap; // Effect.tap
fx.tapError; // Effect.tapError
fx.span; // Effect.withSpan
fx.runSafe; // Effect.runPromiseExit
fx.runSync; // Effect.runSync
fx.runSafeSync; // Effect.runSyncExit
fx.runExitSync; // Effect.runSyncExit

fx.parallel; // fx.sequence with unbounded concurrency
fx.parallelLimit; // fx.sequence with bounded concurrency
fx.eachParallel; // fx.each with unbounded concurrency
fx.eachLimit; // fx.each with bounded concurrency
fx.eachDiscard; // fx.each with discarded results
fx.eachDiscardParallel; // fx.eachDiscard with unbounded concurrency
fx.eachDiscardLimit; // fx.eachDiscard with bounded concurrency

fx.layer; // Layer.effect
fx.layerSync; // Layer.succeed
fx.use; // Effect.provideService
fx.provide; // Effect.provide
fx.recoverTag; // Effect.catchTag
fx.recoverFrom; // Effect.catchTag
fx.timeoutFail; // Effect.timeoutFail
fx.retryTimes; // Effect.retry + Schedule.recurs
fx.retryBackoff; // Effect.retry + Schedule.exponential
fx.runOrThrow; // run and throw the original typed failure value
fx.runResult; // run and return a plain JavaScript Result value
```

## Source Layout

```txt
src/index.ts
src/effect.ts
src/types.ts
src/builders.ts
src/concurrency.ts
src/errors.ts
src/dependencies.ts
src/logging.ts
src/runtime.ts
```

## Contributing

This repository uses Bun for package management and validation.

```bash
bun install
bun run typecheck
bun run build
```
