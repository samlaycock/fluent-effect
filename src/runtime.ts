import { Effect, Layer, ManagedRuntime } from "effect";

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
  const runtime = ManagedRuntime.make(dependencies as Layer.Layer<ROut, E2, never>);

  return {
    provide,
    run: <A, E>(self: RunnableTask<RIn, ROut, A, E>) => runtime.runPromise(self),
    runOrThrow: async <A, E>(self: RunnableTask<RIn, ROut, A, E>) => {
      const result = await runtime.runPromise(Effect.either(self));

      if (result._tag === "Left") {
        throw result.left;
      }

      return result.right;
    },
    runResult: async <A, E>(self: RunnableTask<RIn, ROut, A, E>): Promise<Result<A, E | E2>> => {
      const result = await runtime.runPromise(Effect.either(self));

      if (result._tag === "Left") {
        return { ok: false, error: result.left };
      }

      return { ok: true, value: result.right };
    },
    runSync: <A, E>(self: RunnableTask<RIn, ROut, A, E>) => runtime.runSync(self),
    runOrThrowSync: <A, E>(self: RunnableTask<RIn, ROut, A, E>) => {
      const result = runtime.runSync(Effect.either(self));

      if (result._tag === "Left") {
        throw result.left;
      }

      return result.right;
    },
    runResultSync: <A, E>(self: RunnableTask<RIn, ROut, A, E>): Result<A, E | E2> => {
      const result = runtime.runSync(Effect.either(self));

      if (result._tag === "Left") {
        return { ok: false, error: result.left };
      }

      return { ok: true, value: result.right };
    },
    runExit: <A, E>(self: RunnableTask<RIn, ROut, A, E>) => runtime.runPromiseExit(self),
    runExitSync: <A, E>(self: RunnableTask<RIn, ROut, A, E>) => runtime.runSyncExit(self),
    dispose: () => runtime.dispose(),
    [Symbol.asyncDispose]: () => runtime.dispose(),
  } as const;
};
