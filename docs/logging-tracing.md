# Logging and Tracing

`fluent-effect` exposes small logging and tracing helpers for common
application instrumentation while keeping native Effect behavior available.

## Log Helpers

Use `fx.log`, `fx.logWarn`, and `fx.logError` inside tasks to emit Effect logs.
They return `Task<void>`, so they compose with generator syntax and preserve the
success, failure, and dependency types of the surrounding task.

```ts
const loadUser = (id: string) =>
  fx.task(function* () {
    yield* fx.log("Loading user", { userId: id });

    const user = yield* Users.findById(id);

    yield* fx.log("Loaded user", { userId: user.id, plan: user.plan });
    return user;
  });
```

The optional second argument is a `Record<string, unknown>` and is forwarded as
structured log data to Effect:

```
yield* fx.log("Cache hit", { key, ttlMs: 30_000 });
yield* fx.logWarn("Slow user lookup", { userId, elapsedMs });
yield* fx.logError("Payment provider failed", { provider, cause });
```

Choose the helper by severity:

| Helper        | Effect primitive    | Intended level |
| ------------- | ------------------- | -------------- |
| `fx.log`      | `Effect.logInfo`    | info           |
| `fx.logWarn`  | `Effect.logWarning` | warning        |
| `fx.logError` | `Effect.logError`   | error          |

These helpers do not install a logger, change log formatting, or alter Effect's
runtime logging configuration. Configure those concerns with native Effect
layers or services at the application boundary.

## Spans and Traces

Use `fx.span(task, name, options)` to wrap a task in an Effect tracing span.
`fx.trace` is an alias for `fx.span`; use whichever reads better in the calling
code.

```ts
const loadUser = (id: string) =>
  fx.span(
    fx.task(function* () {
      yield* fx.log("Loading user", { userId: id });
      return yield* Users.findById(id);
    }),
    "load-user",
    {
      attributes: { userId: id },
      kind: "internal",
    },
  );
```

Span options are native `Tracer.SpanOptions` and are forwarded directly to
`Effect.withSpan`. Common options include:

| Option       | Purpose                                                               |
| ------------ | --------------------------------------------------------------------- |
| `attributes` | Structured span attributes such as IDs and counts.                    |
| `kind`       | Span kind: `internal`, `server`, `client`, `producer`, or `consumer`. |
| `links`      | Native Effect span links.                                             |
| `parent`     | Explicit parent span.                                                 |
| `root`       | Start a root span instead of inheriting a parent.                     |

Prefer span attributes for stable, queryable dimensions such as entity IDs,
operation names, counts, and external system names. Prefer log metadata for
point-in-time details that explain a specific event.

## Relationship to Native Effect

Logging and tracing helpers are intentionally thin:

- `fx.log(message, data?)` delegates to `Effect.logInfo`.
- `fx.logWarn(message, data?)` delegates to `Effect.logWarning`.
- `fx.logError(message, data?)` delegates to `Effect.logError`.
- `fx.span(task, name, options?)` delegates to `Effect.withSpan`.
- `fx.trace(task, name, options?)` is the same helper as `fx.span`.

Use `fluent-effect/effect` when you need lower-level Effect instrumentation
APIs, custom loggers, tracer providers, scoped spans, span events, or direct
access to the current span.

```ts
import { Effect, Logger } from "fluent-effect/effect";
```
