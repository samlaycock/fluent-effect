# Concurrency

Collection helpers are sequential by default. This project makes that default
explicit so call sites do not accidentally opt into parallel work through native
Effect defaults.

## Defaults

`fx.sequence`, `fx.each`, and `fx.eachDiscard` use `concurrency: 1` when no
option is provided. They preserve the native Effect result typing for arrays,
records, and iterables, but normalize the execution mode before delegating to
Effect.

```ts
fx.sequence(tasks);
fx.each(items, processItem);
fx.eachDiscard(items, writeItem);
```

Use the default for work that must happen in order, work with shared mutable
resources, or APIs that should not be called concurrently.

## Parallel Work

Pass `concurrency: true` for unbounded parallelism. The helper translates this
to Effect's `"unbounded"` concurrency setting.

```ts
fx.sequence(tasks, { concurrency: true });
fx.each(items, processItem, { concurrency: true });
fx.eachDiscard(items, writeItem, { concurrency: true });
```

The aliases `fx.parallel`, `fx.eachParallel`, and `fx.eachDiscardParallel`
express the same unbounded behavior.

## Bounded Parallelism

Pass a positive finite integer to bound parallelism.

```ts
fx.sequence(tasks, { concurrency: 5 });
fx.each(items, processItem, { concurrency: 5 });
fx.eachDiscard(items, writeItem, { concurrency: 5 });
```

The aliases `fx.parallelLimit`, `fx.eachLimit`, and `fx.eachDiscardLimit`
express the same bounded behavior.

Bounded concurrency is validated before the Effect helper runs. Non-integer,
non-finite, zero, or negative limits throw a `RangeError` synchronously with the
message `bounded concurrency must be a positive finite integer`.

## Batch Traversal

Use `fx.eachBatch` for large collections that should be processed in chunks.
Batches run sequentially, while items inside each batch use the same concurrency
option as `fx.each`. Results keep the original input order.

```ts
const users = yield * fx.eachBatch(userIds, 100, (id) => loadUser(id), { concurrency: 10 });
```

Batch size is validated before any task runs. Non-integer, non-finite, zero, or
negative sizes throw a `RangeError` synchronously with the message
`batch size must be a positive finite integer`.

## Discard Traversal

Use `fx.eachDiscard` when each item must run for its effect but the result array
is not needed. This delegates to `Effect.forEach` with `discard: true`, avoiding
collection of unused success values.
