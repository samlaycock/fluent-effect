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
    fx.try({
      try: () => connection.close({ failed: exit._tag === "Failure" }),
      catch: (cause) => {
        console.error("connection cleanup failed", cause);
      },
    }),
);
```

`fx.bracket` is the same helper under a shorter traditional name.

## Typing

The returned task includes the acquire and use success/failure/dependency
types, plus any dependencies needed by the release finalizer. The release
success value is discarded.

Effect finalizers are expected not to introduce typed failures. If cleanup can
fail, handle that failure inside the release task by logging, reporting, or
defecting intentionally with native Effect APIs.

## Native Escape Hatch

Prefer `fx.acquireUseRelease` for direct acquire/use/release workflows. Import
from `fluent-effect/effect` when you need lower-level scoped resources, layers,
custom finalizer composition, or other native resource primitives.
