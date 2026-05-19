# Errors

`fluent-effect` encourages tagged application errors. Error values are plain
objects with an `_tag` property plus the fields supplied at construction time.

## Single Error Constructors

`fx.error("Name")` creates a typed constructor factory. Calling the returned
factory with a field shape creates a constructor for that error.

```ts
const NotFound = fx.error("NotFound")<{ id: string }>();

const error = NotFound({ id: "1" });
// { id: "1", _tag: "NotFound" }
```

Empty field shapes can be called without an argument.

```ts
const TimedOut = fx.error("TimedOut")<{}>();

TimedOut();
// { _tag: "TimedOut" }
```

The constructor also exposes `type` with the tag name.

## Error Families

`fx.errors<Spec>()` creates a lazy family of constructors. Property access
creates and caches the constructor for that property.

```ts
const AppError = fx.errors<{
  NotFound: { id: string };
  NetworkError: { cause: unknown };
}>();

AppError.NotFound({ id: "1" });
```

Type-only specs are erased at runtime. If code needs runtime discoverability
through `Object.keys`, `in`, property descriptors, or object spread, pass a
runtime spec with the expected keys.

```ts
const AppError = fx.errors<{
  NotFound: { id: string };
  NetworkError: { cause: unknown };
}>({
  NotFound: null,
  NetworkError: null,
});

Object.keys(AppError); // ["NotFound", "NetworkError"]
```

## Recovery

Recovery helpers are aliases over native Effect error handling:

- `fx.recover` recovers from any typed failure.
- `fx.recoverTag` and `fx.recoverFrom` recover from one tagged error.
- `fx.recoverErrors` recovers from several tagged errors.
- `fx.match`, `fx.either`, and `fx.orElse` expose common native conversions and
  fallback behavior.

## Guards and Optional Values

`fx.ensure(condition, onFalse)` succeeds with `undefined` when the condition is
true and fails with `onFalse()` when it is false.

`fx.require(value, onMissing)` succeeds with `NonNullable<value>` unless the
value is `null` or `undefined`.

`fx.orNull(task)` and `fx.orUndefined(task)` replace any typed failure with
`null` or `undefined`.

## Runtime Boundaries

`fx.runOrThrow` and `fx.runOrThrowSync` throw the original typed failure value
rather than wrapping it. `fx.runResult` and `fx.runResultSync` convert task
completion to a plain JavaScript result object.
