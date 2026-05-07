# fluent-effect

An ergonomic house dialect over Effect.

`fluent-effect` keeps native Effect available, but gives application code a smaller, clearer vocabulary for tasks, typed errors, dependencies, concurrency, and runtime entrypoints.

## Install

```bash
bun install
```

## Validate

```bash
bun run typecheck
bun run build
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

Prefer `fx.errors` for application errors. Calling a constructor creates the error instance.

```ts
import type { ErrorOf, ErrorsOf } from "fluent-effect";

const AppError = fx.errors<{
  NotFound: { id: string };
  NetworkError: { cause: unknown };
}>();

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

Define dependencies once, pull them by name inside tasks, provide implementations at the edge.

```ts
interface Users {
  readonly findById: (id: string) => fx.Task<User, NotFound>;
}

interface AuditLog {
  readonly record: (message: string) => fx.Task<void>;
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
  fx.provideDependency(
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

Use options when execution strategy matters. The default is sequential.

```ts
fx.sequence(tasks);
fx.sequence(tasks, { concurrency: true });
fx.sequence(tasks, { concurrency: 5 });

fx.each(items, fn);
fx.each(items, fn, { concurrency: true });
fx.each(items, fn, { concurrency: 5 });
```

Omit `concurrency` for sequential work, use `true` to turn parallelism on without a limit, or pass a number to bound parallelism.

### Retry, Timeout, Tracing

```ts
fx.retry(task, { times: 3 });

fx.retry(task, {
  backoff: "100 millis",
  factor: 2,
  times: 5,
});

fx.timeout(task, "5 seconds", () => AppError.Timeout({ operation }));

fx.trace(task, "load-user", {
  attributes: { userId },
});
```

### Runtime

```ts
fx.run(task);
fx.runWith(task, dependencies);

const app = fx.app(dependencies);
app.run(task);
app.runExit(task);
```

## Native Escape Hatch

`fluent-effect/effect` is a direct passthrough:

```ts
export * from "effect";
```

Use it when the house API does not cover what you need:

```ts
import { Effect, Schedule, Layer } from "fluent-effect/effect";
```

## Examples

Focused examples live in [examples/](./examples):

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

fx.layer; // Layer.effect
fx.layerSync; // Layer.succeed
fx.use; // Effect.provideService
fx.provide; // Effect.provide
fx.recoverTag; // Effect.catchTag
fx.recoverFrom; // Effect.catchTag
fx.timeoutFail; // Effect.timeoutFail
fx.retryTimes; // Effect.retry + Schedule.recurs
fx.retryBackoff; // Effect.retry + Schedule.exponential
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
