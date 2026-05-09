# Core Concepts

`fluent-effect` is a small API over Effect. It keeps Effect's typed runtime
model, but gives application code shorter names for common operations.

## Task

A `Task<A, E, R>` is an Effect value:

- `A` is the success value.
- `E` is the typed failure value.
- `R` is the dependency environment required to run the task.

```ts
import { fx, type Task } from "fluent-effect";

const task: Task<number> = fx.succeed(1);
```

Tasks are descriptions of work. They do not run until passed to a runtime
boundary such as `fx.run`, `fx.runResult`, or `app.run`.

## Typed Failures

Failures are values, not exceptions. `fx.errors` creates tagged constructors so
application code can recover by error tag.

```ts
const AppError = fx.errors<{
  NotFound: { id: string };
}>();

const missing = fx.fail(AppError.NotFound({ id: "1" }));
```

Use `fx.try` at JavaScript boundaries that may throw or reject, and convert the
unknown cause into an application error.

## Generator Syntax

`fx.task(function* () {})` lets code read top-to-bottom. Use `yield*` to wait for
another task and receive its success value.

```ts
const program = fx.task(function* () {
  const user = yield* loadUser("1");
  return user.name;
});
```

## Dependencies

Dependencies are declared as tags and provided at the application edge. A task
that reads a dependency carries that requirement in its `R` type until the
dependency is provided.

```ts
interface Config {
  readonly appName: string;
}

const Config = fx.dependency<Config>("Config");

const program = fx.task(function* () {
  const config = yield* fx.getDependency(Config);
  return config.appName;
});
```

## Native Effect

Use `fluent-effect` for the house API and `fluent-effect/effect` when you need
native Effect modules such as `Effect`, `Schedule`, `Duration`, or `Layer`.

```ts
import { fx } from "fluent-effect";
import { Schedule } from "fluent-effect/effect";
```
