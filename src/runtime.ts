import { Effect, Layer } from "effect";
import type { Task } from "./types.js";

/** Run a fully-provided Task and get back a Promise. */
export const run = Effect.runPromise;

/** Run a synchronous Task. Throws if the Task performs async work. */
export const runSync = Effect.runSync;

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
export const app = <ROut, E2>(dependencies: Layer.Layer<ROut, E2, never>) => {
  const provide = <A, E, R>(self: Task<A, E, R>) => Effect.provide(self, dependencies);

  return {
    provide,
    run: <A, E>(self: Task<A, E, ROut>) => Effect.runPromise(provide(self)),
    runSync: <A, E>(self: Task<A, E, ROut>) => Effect.runSync(provide(self)),
    runExit: <A, E>(self: Task<A, E, ROut>) => Effect.runPromiseExit(provide(self)),
    runExitSync: <A, E>(self: Task<A, E, ROut>) => Effect.runSyncExit(provide(self)),
  } as const;
};
