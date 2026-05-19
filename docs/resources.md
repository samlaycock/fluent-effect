# Resource Safety

Use `fx.acquireUseRelease` when a workflow needs a resource to be released
after it is used, even when use fails or the task is interrupted.

```ts
import { fx } from "fluent-effect";

const program = fx.acquireUseRelease(
  fx.try({
    try: () => openConnection(),
    catch: (cause) => ({ _tag: "OpenFailed" as const, cause }),
  }),
  (connection) =>
    fx.try({
      try: () => connection.query("select 1"),
      catch: (cause) => ({ _tag: "QueryFailed" as const, cause }),
    }),
  (connection, exit) =>
    fx.sync(() => {
      try {
        connection.close({ failed: exit._tag === "Failure" });
      } catch (cause) {
        console.error("connection cleanup failed", cause);
      }
    }),
);
```

`fx.bracket` is the same helper under a shorter traditional name.

## Scoped Resources

Use `fx.acquireRelease` when acquiring a resource should register a finalizer
with the current Effect scope. Wrap the scoped workflow in `fx.scoped` when the
scope should be opened and closed around one task.

```ts
import { fx } from "fluent-effect";

const program = fx.scoped(
  fx
    .acquireRelease(
      fx.try({
        try: () => openConnection(),
        catch: (cause) => ({ _tag: "OpenFailed" as const, cause }),
      }),
      (connection, exit) =>
        fx.sync(() => {
          connection.close({ failed: exit._tag === "Failure" });
        }),
    )
    .pipe(
      fx.chain((connection) =>
        fx.try({
          try: () => connection.query("select 1"),
          catch: (cause) => ({ _tag: "QueryFailed" as const, cause }),
        }),
      ),
    ),
);
```

Use `fx.layerScoped` when a dependency implementation itself owns a scoped
resource. The resource is released when the runtime boundary is disposed.

```ts
import { fx } from "fluent-effect";

interface Database {
  readonly query: (sql: string) => Promise<unknown>;
}

const Database = fx.dependency<Database>("Database");

const databaseLayer = fx.layerScoped(
  Database,
  fx.acquireRelease(
    fx.try({
      try: () => connectDatabase(),
      catch: (cause) => ({ _tag: "DatabaseOpenFailed" as const, cause }),
    }),
    (database) =>
      fx.sync(() => {
        database.close();
      }),
  ),
);
```

## Typing

The returned task includes the acquire and use success/failure/dependency
types, plus any dependencies needed by the release finalizer. The release
success value is discarded.

`fx.acquireRelease` returns a scoped task, so its dependency type includes the
native `Scope.Scope` requirement until it is passed to `fx.scoped` or used in
`fx.layerScoped`.

Effect finalizers are expected not to introduce typed failures. If cleanup can
fail, handle that failure inside the release task by logging, reporting, or
defecting intentionally with native Effect APIs.

## Native Escape Hatch

Prefer `fx.acquireUseRelease` for direct acquire/use/release workflows. Prefer
`fx.acquireRelease`, `fx.scoped`, and `fx.layerScoped` when a resource should
live for a scope or runtime boundary. Import from `fluent-effect/effect` when
you need custom finalizer composition or other native resource primitives.
