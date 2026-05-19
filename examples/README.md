# Examples

These examples are living docs and are compiled by `bun run typecheck`.

## `dependencies.ts`

Shows the recommended dependency flow:

```ts
fx.dependency;
fx.getDependency;
fx.provideDependency;
fx.dependencies;
fx.app;
```

Use this when you want to see how a program, dependency definitions, dependency implementations, and runtime wiring fit together.

## `errors.ts`

Shows typed application errors and validation:

```ts
fx.errors;
fx.ensure;
fx.require;
fx.recoverErrors;
fx.match;
fx.either;
```

Use this when you want the recommended pattern for defining error constructors and creating error instances.

## `fallbacks.ts`

Shows common ways to turn failures into values or alternatives:

```ts
fx.orNull;
fx.orUndefined;
fx.orElse;
fx.either;
fx.ensure;
fx.require;
```

Use this when you want compact fallbacks without dropping type information.

## `control-flow.ts`

Shows task control-flow and whole-error recovery:

```ts
fx.map;
fx.when;
fx.recover;
fx.log;
fx.logError;
```

Use this when you want readable branching, transformation, and fallback behavior inside a program.

## `composition.ts`

Shows direct task composition and success/failure hooks:

```ts
fx.andThen;
fx.onSuccess;
fx.onFailure;
fx.log;
fx.logWarn;
```

Use this when you want to compose small tasks without generator syntax.

## `collections.ts`

Shows sequential, parallel, and bounded collection processing:

```ts
fx.each;
fx.eachBatch;
fx.sequence;
```

Use this when you want collection APIs that make execution strategy obvious.

## `batch-job.ts`

Shows a realistic workflow with concurrency and operational concerns:

```ts
fx.eachBatch;
fx.retry;
fx.timeout;
fx.trace;
fx.log;
```

Use this when you want to see how retry, timeout, tracing, logging, and bounded parallel work read together.

## `runtime.ts`

Shows runtime wiring around a dependency-backed program:

```ts
fx.runWith;
fx.app;
app.provide;
app.run;
app.runExit;
```

Use this when you want to see the difference between a program, a provided program, and an executed program.
