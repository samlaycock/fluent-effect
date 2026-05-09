import { Effect, Layer } from "effect";

import type { Result, Task } from "./types.js";

type RunnableTask<RIn, ROut, A, E> = [RIn] extends [never] ? Task<A, E, ROut> : never;

/** Run a fully-provided Task and get back a Promise. */
export const run = Effect.runPromise;

/** Run a Task and throw the original typed failure value if it fails. */
export const runOrThrow = async <A, E>(self: Task<A, E>): Promise<A> => {
  const result = await Effect.runPromise(Effect.either(self));

  if (result._tag === "Left") {
    throw result.left;
  }

  return result.right;
};

/** Run a Task and return a plain JavaScript Result value. */
export const runResult = async <A, E>(self: Task<A, E>): Promise<Result<A, E>> => {
  const result = await Effect.runPromise(Effect.either(self));

  if (result._tag === "Left") {
    return { ok: false, error: result.left };
  }

  return { ok: true, value: result.right };
};

/** Run a synchronous Task. Throws if the Task performs async work. */
export const runSync = Effect.runSync;

/** Run a synchronous Task and throw the original typed failure value if it fails. */
export const runOrThrowSync = <A, E>(self: Task<A, E>): A => {
  const result = Effect.runSync(Effect.either(self));

  if (result._tag === "Left") {
    throw result.left;
  }

  return result.right;
};

/** Run a synchronous Task and return a plain JavaScript Result value. */
export const runResultSync = <A, E>(self: Task<A, E>): Result<A, E> => {
  const result = Effect.runSync(Effect.either(self));

  if (result._tag === "Left") {
    return { ok: false, error: result.left };
  }

  return { ok: true, value: result.right };
};

/** Run a Task and get an Exit value instead of throwing/rejecting. */
export const runSafe = Effect.runPromiseExit;

/** Run a Task and get an Exit value instead of throwing/rejecting. */
export const runExit = runSafe;

/** Run a synchronous Task and get an Exit value. */
export const runSafeSync = Effect.runSyncExit;

/** Run a synchronous Task and get an Exit value. */
export const runExitSync = runSafeSync;

/** Run a Task with a dependency environment and get back a Promise. */
export const runWith = <A, E, ROut, E2>(
  self: Task<A, E, ROut>,
  dependencies: Layer.Layer<ROut, E2, never>,
): Promise<A> => Effect.runPromise(Effect.provide(self, dependencies));

/** Run a Task with a reusable dependency environment. */
export const app = <ROut, E2, RIn>(dependencies: Layer.Layer<ROut, E2, RIn>) => {
  const provide = <A, E, R>(self: Task<A, E, R>) => Effect.provide(self, dependencies);

  return {
    provide,
    run: <A, E>(self: RunnableTask<RIn, ROut, A, E>) =>
      Effect.runPromise(provide(self) as Task<A, E | E2>),
    runOrThrow: <A, E>(self: RunnableTask<RIn, ROut, A, E>) =>
      runOrThrow(provide(self) as Task<A, E | E2>),
    runResult: <A, E>(self: RunnableTask<RIn, ROut, A, E>) =>
      runResult(provide(self) as Task<A, E | E2>),
    runSync: <A, E>(self: RunnableTask<RIn, ROut, A, E>) =>
      Effect.runSync(provide(self) as Task<A, E | E2>),
    runOrThrowSync: <A, E>(self: RunnableTask<RIn, ROut, A, E>) =>
      runOrThrowSync(provide(self) as Task<A, E | E2>),
    runResultSync: <A, E>(self: RunnableTask<RIn, ROut, A, E>) =>
      runResultSync(provide(self) as Task<A, E | E2>),
    runExit: <A, E>(self: RunnableTask<RIn, ROut, A, E>) =>
      Effect.runPromiseExit(provide(self) as Task<A, E | E2>),
    runExitSync: <A, E>(self: RunnableTask<RIn, ROut, A, E>) =>
      Effect.runSyncExit(provide(self) as Task<A, E | E2>),
  } as const;
};
