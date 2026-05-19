# API Reference

Import the house API from the package root.

```ts
import { fx } from "fluent-effect";
```

## Builders

| Helper                   | Purpose                                                               |
| ------------------------ | --------------------------------------------------------------------- |
| `fx.task`                | Build a task with Effect generator syntax.                            |
| `fx.succeed`, `fx.ok`    | Create a successful task.                                             |
| `fx.sync`, `fx.fromSync` | Create a synchronous task from a function.                            |
| `fx.fail`                | Create a failed task.                                                 |
| `fx.try`                 | Convert throwing or rejecting code into a typed task.                 |
| `fx.trySync`             | Convert synchronous throwing code into a synchronously runnable task. |
| `fx.acquireUseRelease`   | Acquire, use, and release a resource safely.                          |
| `fx.bracket`             | Alias for `fx.acquireUseRelease`.                                     |
| `fx.acquireRelease`      | Acquire a scoped resource and register its finalizer.                 |
| `fx.scoped`              | Run a scoped task and close the scope when it completes.              |

## Errors

| Helper                            | Purpose                                               |
| --------------------------------- | ----------------------------------------------------- |
| `fx.error`                        | Create one tagged error constructor factory.          |
| `fx.errors`                       | Create a family of tagged error constructors.         |
| `fx.ensure`                       | Fail when a condition is false.                       |
| `fx.require`                      | Fail when a value is `null` or `undefined`.           |
| `fx.recover`                      | Recover from any typed failure.                       |
| `fx.recoverTag`, `fx.recoverFrom` | Recover from one tagged failure.                      |
| `fx.recoverErrors`                | Recover from several tagged failures.                 |
| `fx.match`                        | Convert success or failure to a value.                |
| `fx.either`                       | Convert success or failure to native Effect `Either`. |
| `fx.orElse`                       | Fall back to another task.                            |
| `fx.orNull`, `fx.orUndefined`     | Replace any typed failure with `null` or `undefined`. |

## Composition and Collections

| Helper                        | Purpose                                               |
| ----------------------------- | ----------------------------------------------------- |
| `fx.map`                      | Transform a task success value.                       |
| `fx.chain`, `fx.andThen`      | Sequence another task after success.                  |
| `fx.tap`, `fx.onSuccess`      | Run a task on success without changing the value.     |
| `fx.tapError`, `fx.onFailure` | Run a task on failure without recovering.             |
| `fx.when`                     | Branch between two tasks from a boolean condition.    |
| `fx.sequence`                 | Run a collection of tasks sequentially by default.    |
| `fx.parallel`                 | Run a collection of tasks with unbounded concurrency. |
| `fx.parallelLimit`            | Run a collection of tasks with bounded concurrency.   |
| `fx.each`                     | Traverse items sequentially by default.               |
| `fx.eachParallel`             | Traverse items with unbounded concurrency.            |
| `fx.eachLimit`                | Traverse items with bounded concurrency.              |
| `fx.eachDiscard`              | Traverse items and discard success values.            |
| `fx.eachDiscardParallel`      | Discard traversal with unbounded concurrency.         |
| `fx.eachDiscardLimit`         | Discard traversal with bounded concurrency.           |
| `fx.all`                      | Native Effect collection helper.                      |

## Retry, Timeout, and Tracing

| Helper                                | Purpose                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `fx.retry`                            | Retry with a native schedule or simple options object.             |
| `fx.retryTimes`                       | Retry a fixed number of times after the initial attempt.           |
| `fx.retryBackoff`                     | Retry with exponential backoff.                                    |
| `fx.timeout`                          | Apply a timeout, optionally converting timeout to a typed failure. |
| `fx.timeoutFail`                      | Apply a timeout that fails with an application error.              |
| `fx.log`, `fx.logWarn`, `fx.logError` | Log through Effect with optional structured metadata.              |
| `fx.trace`, `fx.span`                 | Wrap a task in an Effect tracing span with optional span metadata. |

## Dependencies and Layers

| Helper                                          | Purpose                                           |
| ----------------------------------------------- | ------------------------------------------------- |
| `fx.dependency`, `fx.service`                   | Define a dependency tag.                          |
| `fx.getDependency`                              | Read one dependency or an object of dependencies. |
| `fx.getDependencies`                            | Read an object of dependencies.                   |
| `fx.provideDependency`, `fx.dependencyValue`    | Provide an already-built dependency value.        |
| `fx.provideDependencyTask`, `fx.dependencyTask` | Build and provide a dependency from a task.       |
| `fx.layer`                                      | Native `Layer.effect`.                            |
| `fx.layerSync`                                  | Native `Layer.succeed`.                           |
| `fx.layerScoped`                                | Native `Layer.scoped` for scoped dependencies.    |
| `fx.dependencies`, `fx.mergeAllLayers`          | Merge many layers.                                |
| `fx.mergeLayers`                                | Merge two layers.                                 |
| `fx.withDependency`, `fx.withDependencies`      | Provide one value or one layer to a task.         |
| `fx.provide`                                    | Native `Effect.provide`.                          |
| `fx.use`                                        | Native `Effect.provideService`.                   |

## Runtime

| Helper                             | Purpose                                                           |
| ---------------------------------- | ----------------------------------------------------------------- |
| `fx.run`                           | Run a fully provided task as a promise.                           |
| `fx.runOrThrow`                    | Run and throw the original typed failure value.                   |
| `fx.runResult`                     | Run and return a plain JavaScript `Result`.                       |
| `fx.runExit`, `fx.runSafe`         | Run and return native Effect `Exit`.                              |
| `fx.runWith`                       | Provide dependencies and run once.                                |
| `fx.runWithOrThrow`                | Provide dependencies once and throw original typed failures.      |
| `fx.runWithResult`                 | Provide dependencies once and return a plain JavaScript `Result`. |
| `fx.app`                           | Create a reusable dependency-backed runtime boundary.             |
| `fx.runSync`                       | Run a synchronously runnable task.                                |
| `fx.runOrThrowSync`                | Synchronously run and throw the original typed failure value.     |
| `fx.runResultSync`                 | Synchronously run and return a plain JavaScript `Result`.         |
| `fx.runExitSync`, `fx.runSafeSync` | Synchronously run and return native Effect `Exit`.                |

## Public Types

| Type                               | Purpose                                            |
| ---------------------------------- | -------------------------------------------------- |
| `Task<A, E, R>`                    | Alias for `Effect.Effect<A, E, R>`.                |
| `AnyTask`                          | Unknown task type for constraints.                 |
| `TaskResult<T>`                    | Infer a task success type.                         |
| `TaskError<T>`                     | Infer a task failure type.                         |
| `TaskDeps<T>`                      | Infer a task dependency environment.               |
| `Result<A, E>`                     | Plain result object returned by result runners.    |
| `FxError<Name, Fields>`            | Tagged error object type.                          |
| `ErrorFactory<Name>`               | Type of `fx.error(name)`.                          |
| `ErrorConstructor<Name, Fields>`   | Error constructor type; empty fields are optional. |
| `ErrorConstructors<Spec>`          | Type of an error constructor family.               |
| `ErrorOf<T>`, `ErrorInstance<T>`   | Infer one constructor's error value.               |
| `ErrorsOf<T>`, `ErrorInstances<T>` | Infer the union of a constructor family.           |

The root also exports `Cause`, `Exit`, and `pipe` from Effect. Import broader
native Effect modules from `fluent-effect/effect`.
