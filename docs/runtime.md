# Runtime Boundaries

Tasks are lazy descriptions of work. Runtime helpers decide how a task is
executed and how failures are represented outside Effect.

## Choosing a Runner

| Helper                           | Use when                                        | Failure behavior                                           |
| -------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| `fx.run(task)`                   | You want a `Promise` for a fully provided task. | The returned promise rejects using native Effect behavior. |
| `fx.runOrThrow(task)`            | Boundary code expects thrown typed failures.    | Throws the original typed failure value.                   |
| `fx.runResult(task)`             | Boundary code wants a plain result object.      | Resolves to `{ ok: false, error }`.                        |
| `fx.runExit(task)`               | You need native `Exit` details.                 | Resolves to an Effect `Exit`.                              |
| `fx.runWith(task, dependencies)` | You have one dependency layer and one task.     | Provides the layer, then behaves like `fx.run`.            |
| `fx.app(dependencies)`           | Many tasks share the same dependency layer.     | Provides the layer through reusable methods.               |

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

## Reusable Applications

`fx.app(dependencies)` creates a reusable boundary around a layer.

```ts
const app = fx.app(dependencies);

await app.run(loadUser("1"));
await app.runResult(loadUser("2"));
```

Use `app.provide(task)` when you want to provide dependencies but keep the task
lazy for later composition.

## Synchronous Runners

The `Sync` helpers are only for synchronously runnable tasks. They throw if the
task performs async work.

```ts
fx.runSync(task);
fx.runOrThrowSync(task);
fx.runResultSync(task);
fx.runExitSync(task);
```
