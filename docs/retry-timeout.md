# Retry and Timeout

`fluent-effect` supports native Effect retry schedules and a smaller options
object for common retry cases.

## Retry Attempts

`fx.retry(task, { times })` and `fx.retryTimes(task, times)` use
`Schedule.recurs(times)`. The `times` value counts retries after the initial
attempt, not total attempts.

For example, `times: 3` can run the task once initially and then retry up to
three additional times.

If `times` is omitted and no backoff is provided, the helper retries zero times.

```ts
fx.retry(task, { times: 3 });
fx.retryTimes(task, 3);
```

## Backoff

`fx.retry(task, { backoff, factor, times })` uses an exponential backoff
schedule. `backoff` is the base duration and `factor` is forwarded to
`Schedule.exponential`.

```ts
fx.retry(task, {
  backoff: "100 millis",
  factor: 2,
  times: 5,
});
```

When `times` is provided with backoff, the helper intersects the exponential
schedule with `Schedule.recurs(times)`, so retrying stops when either schedule
stops. When `times` is omitted, the backoff schedule is uncapped by this helper.

## Native Schedules

Pass a native `Schedule` when the options object is too small for the desired
policy.

```ts
fx.retry(task, Schedule.recurs(3));
```

Native schedules are passed directly to `Effect.retry`.

## Timeout

`fx.timeout(task, duration)` delegates to `Effect.timeout`. It succeeds with the
original value when the task completes in time and uses native Effect timeout
semantics when it does not.

```ts
fx.timeout(task, "5 seconds");
```

Pass an `onTimeout` function to fail with a typed application error instead.
This delegates to `Effect.timeoutFail`.

```ts
fx.timeout(task, "5 seconds", () => AppError.Timeout({ operation }));
fx.timeoutFail(task, "5 seconds", () => AppError.Timeout({ operation }));
```
