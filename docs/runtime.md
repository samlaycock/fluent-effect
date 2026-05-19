# Runtime Boundaries

Tasks are lazy descriptions of work. Runtime helpers decide how a task is
executed and how failures are represented outside Effect.

## Choosing a Runner

| Helper                                  | Use when                                                         | Failure behavior                                           |
| --------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `fx.run(task)`                          | You want a `Promise` for a fully provided task.                  | The returned promise rejects using native Effect behavior. |
| `fx.runOrThrow(task)`                   | Boundary code expects thrown typed failures.                     | Throws the original typed failure value.                   |
| `fx.runResult(task)`                    | Boundary code wants a plain result object.                       | Resolves to `{ ok: false, error }`.                        |
| `fx.runExit(task)`                      | You need native `Exit` details.                                  | Resolves to an Effect `Exit`.                              |
| `fx.runWith(task, dependencies)`        | You have one dependency layer and one task.                      | Provides the layer, then behaves like `fx.run`.            |
| `fx.runWithOrThrow(task, dependencies)` | One-shot dependency boundary code expects thrown typed failures. | Throws task or layer typed failures directly.              |
| `fx.runWithResult(task, dependencies)`  | One-shot dependency boundary code wants a plain result object.   | Resolves task or layer failures to `{ ok: false, error }`. |
| `fx.app(dependencies)`                  | Many tasks share the same dependency layer.                      | Provides the layer through reusable methods.               |

## Plain Result Objects

`fx.runResult` and `app.runResult` avoid thrown failures and native Effect
`Either` or `Exit` values.

```ts
const result = await fx.runResult(loadUser("1"));

if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

## Throwing Typed Failures

Use `runOrThrow` only at boundaries that already model errors with thrown
values, such as request handlers or tests.

```ts
try {
  const user = await fx.runOrThrow(loadUser("1"));
  console.log(user);
} catch (error) {
  console.error(error);
}
```

For one-shot dependency-backed tasks, use `runWithOrThrow` or `runWithResult`
when layer acquisition failures should use the same typed JavaScript boundary
semantics as task failures.

```ts
const result = await fx.runWithResult(loadUser("1"), dependencies);
```

## Reusable Applications

`fx.app(dependencies)` creates a reusable boundary around a layer. The app's
run methods acquire the layer through a managed runtime and reuse that
environment across repeated runs, so expensive layer startup work is performed
once per app instance instead of once per task execution.

```ts
const app = fx.app(dependencies);

await app.run(loadUser("1"));
await app.runResult(loadUser("2"));
await app.dispose();
```

Use `app.provide(task)` when you want to provide dependencies but keep the task
lazy for later composition. `app.provide(task)` does not force the app runtime
to start; the returned task remains lazy and follows normal `Effect.provide`
semantics when it is eventually run.

Call `app.dispose()` during shutdown when the app is no longer needed. This
releases scoped resources acquired by the dependency layer, such as database
connections, file handles, or HTTP clients with finalizers. The returned app
also implements `[Symbol.asyncDispose]`, so runtimes that support explicit
resource management can dispose it automatically.

Disposal is idempotent: calling `app.dispose()` more than once returns the same
shutdown work and releases scoped resources once. Once disposal starts, the app
is permanently closed. Later calls to `app.provide`, `app.run`,
`app.runOrThrow`, `app.runResult`, `app.runSync`, `app.runOrThrowSync`,
`app.runResultSync`, `app.runExit`, or `app.runExitSync` fail with
`Error("Cannot use fx.app after dispose() has been called")`.

## Synchronous Runners

The `Sync` helpers are only for synchronously runnable tasks. They throw if the
task performs async work.

```ts
fx.runSync(task);
fx.runOrThrowSync(task);
fx.runResultSync(task);
fx.runExitSync(task);
```
