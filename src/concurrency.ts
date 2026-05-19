import { Duration, Effect, Option, Schedule } from "effect";

import type { Task } from "./types.js";

/** Alias: transform the success value of a Task. */
export const map = Effect.map;

/** Alias: chain tasks sequentially. */
export const chain = Effect.flatMap;

/** Alias: continue with another Task based on the success value. */
export const andThen = chain;

/** Alias: run a side-effect without changing the success value. */
export const tap = Effect.tap;

/** Alias: run a side-effect on success without changing the success value. */
export const onSuccess = tap;

/** Alias: run a side-effect on error without changing the error. */
export const tapError = Effect.tapError;

/** Alias: run a side-effect on failure without changing the error. */
export const onFailure = tapError;

type Concurrency = number | true;

type ExecutionOptions<C extends Concurrency = Concurrency> = {
  readonly concurrency?: C | undefined;
};

type EffectConcurrency<C extends Concurrency> = C extends true ? "unbounded" : C;

const validateBoundedConcurrency = (concurrency: number) => {
  if (!Number.isFinite(concurrency) || !Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("bounded concurrency must be a positive finite integer");
  }

  return concurrency;
};

const normalizeConcurrency = (concurrency: Concurrency | undefined) =>
  concurrency === true ? "unbounded" : validateBoundedConcurrency(concurrency ?? 1);

const validateRetryTimes = (times: number) => {
  if (!Number.isFinite(times) || !Number.isInteger(times) || times < 0) {
    throw new RangeError("retry times must be a non-negative finite integer");
  }

  return times;
};

const validateRetryOptions = (options: RetryOptions) => {
  if (options.backoff === undefined && options.factor !== undefined) {
    throw new RangeError(
      "retry factor requires backoff because factor only applies to exponential backoff schedules",
    );
  }

  return options;
};

/** Map over a collection. Sequential by default; pass concurrency for parallel work. */
export function each<I, A, E, R>(
  items: Iterable<I>,
  f: (item: I, index: number) => Task<A, E, R>,
): Task<A[], E, R>;
export function each<I, A, E, R, C extends Concurrency>(
  items: Iterable<I>,
  f: (item: I, index: number) => Task<A, E, R>,
  options: ExecutionOptions<C>,
): Task<A[], E, R>;
export function each<I, A, E, R, C extends Concurrency>(
  items: Iterable<I>,
  f: (item: I, index: number) => Task<A, E, R>,
  options?: ExecutionOptions<C>,
) {
  return Effect.forEach(items, f, { concurrency: normalizeConcurrency(options?.concurrency) });
}

/** Map over a collection for effects only, discarding results. */
export function eachDiscard<I, A, E, R>(
  items: Iterable<I>,
  f: (item: I, index: number) => Task<A, E, R>,
): Task<void, E, R>;
export function eachDiscard<I, A, E, R, C extends Concurrency>(
  items: Iterable<I>,
  f: (item: I, index: number) => Task<A, E, R>,
  options: ExecutionOptions<C>,
): Task<void, E, R>;
export function eachDiscard<I, A, E, R, C extends Concurrency>(
  items: Iterable<I>,
  f: (item: I, index: number) => Task<A, E, R>,
  options?: ExecutionOptions<C>,
) {
  return Effect.forEach(items, f, {
    concurrency: normalizeConcurrency(options?.concurrency),
    discard: true,
  });
}

/** Helper: map over a collection with unbounded concurrency. */
export const eachParallel = <I, A, E, R>(
  items: Iterable<I>,
  f: (item: I, index: number) => Task<A, E, R>,
) => each(items, f, { concurrency: true });

/** Helper: map over a collection with unbounded concurrency and discard results. */
export const eachDiscardParallel = <I, A, E, R>(
  items: Iterable<I>,
  f: (item: I, index: number) => Task<A, E, R>,
) => eachDiscard(items, f, { concurrency: true });

/** Helper: map over a collection with bounded concurrency. */
export const eachLimit = <I, A, E, R>(
  items: Iterable<I>,
  concurrency: number,
  f: (item: I, index: number) => Task<A, E, R>,
) => each(items, f, { concurrency: validateBoundedConcurrency(concurrency) });

/** Helper: map over a collection with bounded concurrency and discard results. */
export const eachDiscardLimit = <I, A, E, R>(
  items: Iterable<I>,
  concurrency: number,
  f: (item: I, index: number) => Task<A, E, R>,
) => eachDiscard(items, f, { concurrency: validateBoundedConcurrency(concurrency) });

/** Alias: native Effect.all. Pass options explicitly for native behavior. */
export const all = Effect.all;

/** Helper: run effects sequentially and collect results. */
export function sequence<const Tasks extends readonly Task<any, any, any>[]>(
  tasks: Tasks,
): Effect.All.Return<Tasks, { readonly concurrency: 1 }>;
export function sequence<const Tasks extends readonly Task<any, any, any>[], C extends Concurrency>(
  tasks: Tasks,
  options: ExecutionOptions<C>,
): Effect.All.Return<Tasks, { readonly concurrency: EffectConcurrency<C> }>;
export function sequence<const Tasks extends Record<string, Task<any, any, any>>>(
  tasks: Tasks,
): Effect.All.Return<Tasks, { readonly concurrency: 1 }>;
export function sequence<
  const Tasks extends Record<string, Task<any, any, any>>,
  C extends Concurrency,
>(
  tasks: Tasks,
  options: ExecutionOptions<C>,
): Effect.All.Return<Tasks, { readonly concurrency: EffectConcurrency<C> }>;
export function sequence<const Tasks extends Iterable<Task<any, any, any>>>(
  tasks: Tasks,
): Effect.All.Return<Tasks, { readonly concurrency: 1 }>;
export function sequence<const Tasks extends Iterable<Task<any, any, any>>, C extends Concurrency>(
  tasks: Tasks,
  options: ExecutionOptions<C>,
): Effect.All.Return<Tasks, { readonly concurrency: EffectConcurrency<C> }>;
export function sequence<C extends Concurrency>(
  tasks: Iterable<Task<any, any, any>> | Record<string, Task<any, any, any>>,
  options?: ExecutionOptions<C>,
) {
  return Effect.all(tasks, { concurrency: normalizeConcurrency(options?.concurrency) });
}

/** Helper: run effects with unbounded concurrency and collect results. */
export function parallel<const Tasks extends readonly Task<any, any, any>[]>(
  tasks: Tasks,
): Effect.All.Return<Tasks, { readonly concurrency: "unbounded" }>;
export function parallel<const Tasks extends Record<string, Task<any, any, any>>>(
  tasks: Tasks,
): Effect.All.Return<Tasks, { readonly concurrency: "unbounded" }>;
export function parallel<const Tasks extends Iterable<Task<any, any, any>>>(
  tasks: Tasks,
): Effect.All.Return<Tasks, { readonly concurrency: "unbounded" }>;
export function parallel(
  tasks: Iterable<Task<any, any, any>> | Record<string, Task<any, any, any>>,
) {
  return Effect.all(tasks, { concurrency: "unbounded" });
}

/** Helper: run effects with bounded concurrency and collect results. */
export function parallelLimit<const Tasks extends readonly Task<any, any, any>[]>(
  tasks: Tasks,
  concurrency: number,
): Effect.All.Return<Tasks, { readonly concurrency: number }>;
export function parallelLimit<const Tasks extends Record<string, Task<any, any, any>>>(
  tasks: Tasks,
  concurrency: number,
): Effect.All.Return<Tasks, { readonly concurrency: number }>;
export function parallelLimit<const Tasks extends Iterable<Task<any, any, any>>>(
  tasks: Tasks,
  concurrency: number,
): Effect.All.Return<Tasks, { readonly concurrency: number }>;
export function parallelLimit(
  tasks: Iterable<Task<any, any, any>> | Record<string, Task<any, any, any>>,
  concurrency: number,
) {
  return Effect.all(tasks, { concurrency: validateBoundedConcurrency(concurrency) });
}

/** Alias: conditionally run one of two tasks. */
export const when = Effect.if;

type RetryOptions =
  | {
      readonly times?: number | undefined;
      readonly backoff?: undefined;
      readonly factor?: undefined;
    }
  | {
      readonly times?: number | undefined;
      readonly backoff: Duration.DurationInput;
      readonly factor?: number | undefined;
    };

/** Retry a task with a schedule/policy or simple house options. */
export function retry<A, E, R, B, R1>(
  self: Task<A, E, R>,
  policy: Schedule.Schedule<B, NoInfer<E>, R1>,
): Task<A, E, R | R1>;
export function retry<A, E, R>(self: Task<A, E, R>, options: RetryOptions): Task<A, E, R>;
export function retry<A, E, R, B, R1>(
  self: Task<A, E, R>,
  policyOrOptions: Schedule.Schedule<B, NoInfer<E>, R1> | RetryOptions,
): Task<A, E, R | R1> {
  if (Schedule.isSchedule(policyOrOptions)) {
    return Effect.retry(self, policyOrOptions);
  }

  const options = validateRetryOptions(policyOrOptions);

  if (options.backoff !== undefined) {
    return retryBackoff(self, {
      base: options.backoff,
      factor: options.factor,
      times: options.times,
    });
  }

  return retryTimes(self, options.times ?? 0);
}

/** Helper: retry a task a fixed number of times. */
export const retryTimes = <A, E, R>(self: Task<A, E, R>, times: number): Task<A, E, R> =>
  Effect.retry(self, Schedule.recurs(validateRetryTimes(times)));

/** Helper: retry a task with exponential backoff, optionally capped by attempts. */
export const retryBackoff = <A, E, R>(
  self: Task<A, E, R>,
  options: {
    readonly base: Duration.DurationInput;
    readonly factor?: number | undefined;
    readonly times?: number | undefined;
  },
): Task<A, E, R> => {
  const backoff = Schedule.exponential(options.base, options.factor);

  if (options.times === undefined) {
    return Effect.retry(self, backoff);
  }

  return Effect.retry(
    self,
    Schedule.intersect(backoff, Schedule.recurs(validateRetryTimes(options.times))),
  );
};

/** Add a timeout to a Task, optionally failing with a typed error. */
export function timeout<A, E, R>(
  self: Task<A, E, R>,
  duration: Duration.DurationInput,
): ReturnType<typeof Effect.timeout<A, E, R>>;
export function timeout<A, E, R, E1>(
  self: Task<A, E, R>,
  duration: Duration.DurationInput,
  onTimeout: () => E1,
): Task<A, E | E1, R>;
export function timeout<A, E, R, E1>(
  self: Task<A, E, R>,
  duration: Duration.DurationInput,
  onTimeout?: () => E1,
) {
  return onTimeout === undefined
    ? Effect.timeout(self, duration)
    : Effect.timeoutFail(self, { duration, onTimeout });
}

/** Helper: add a timeout that fails with a typed error. */
export const timeoutFail = <A, E, R, E1>(
  self: Task<A, E, R>,
  duration: Duration.DurationInput,
  onTimeout: () => E1,
): Task<A, E | E1, R> => timeout(self, duration, onTimeout);

/** Helper: add a timeout that returns None when the timeout wins. */
export const timeoutOption = <A, E, R>(
  self: Task<A, E, R>,
  duration: Duration.DurationInput,
): Task<Option.Option<A>, E, R> => Effect.timeoutOption(self, duration);
