# Dependencies

Dependency helpers are thin wrappers around Effect `Context.Tag` and `Layer`
with names that make application wiring clearer.

## Tags and Lookup

Use `fx.dependency<T>(name)` to define a dependency tag. It is an alias for
`fx.service` and Effect's `Context.GenericTag`.

```ts
import type { Task } from "fluent-effect";

interface Users {
  readonly findById: (id: string) => Task<User, NotFound>;
}

const Users = fx.dependency<Users>("Users");
```

Inside tasks, `fx.getDependency(Users)` returns one dependency. Passing an object
of tags returns a readonly object with the same keys and resolved dependency
values.

```ts
const deps = yield * fx.getDependency({ audit: AuditLog, users: Users });

const { audit, users } = deps;
```

Object lookup preserves string and symbol keys by using `Reflect.ownKeys`.

## Providers

Use `fx.provideDependency(tag, value)` when the implementation value already
exists. This includes values whose methods return tasks.

```ts
fx.provideDependency(Users, {
  findById: (id) => fx.succeed({ id, name: "Ada" }),
});
```

Use `fx.provideDependencyTask(tag, task)` only when creating the implementation
requires running a task at layer construction time.

```ts
fx.provideDependencyTask(
  AuditLog,
  fx.succeed({
    record: (message) => fx.log(message),
  }),
);
```

`fx.dependencyValue` and `fx.dependencyTask` are aliases for those two provider
forms.

## Composition

`fx.dependencies(...)` is `Layer.mergeAll`, so dependency providers are composed
as one layer. `fx.mergeLayers` and `fx.mergeAllLayers` expose native layer merge
helpers for more explicit composition.

```ts
const dependencies = fx.dependencies(
  fx.provideDependency(Users, users),
  fx.provideDependency(AuditLog, audit),
);
```

`fx.withDependency(task, tag, value)` provides one implementation directly to a
task, including when `value` is `undefined`. `fx.withDependency(task, layer)`
provides a full layer.

## Runtime Wiring

`fx.runWith(task, dependencies)` provides a layer once and runs the task as a
promise.

`fx.app(dependencies)` creates a reusable boundary with `provide`, async run
helpers, sync run helpers, result helpers, and exit helpers. Use it at
application edges when many tasks share the same dependency environment.
