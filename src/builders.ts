import { Effect } from "effect";

import type { ErrorConstructors, ErrorFactory, FxError, Task } from "./types.js";

/** Define a task using generator syntax. */
export const task = Effect.gen;

/** Lift a plain value into a successful Task. */
export const ok = Effect.succeed;

/** Lift a plain value into a successful Task. */
export const succeed = ok;

/** Lazily lift a synchronous computation into a successful Task. */
export const sync = Effect.sync;

/** Lazily lift a synchronous computation into a Task. */
export const fromSync = sync;

/** Lift an error value into a failed Task. */
export const fail = Effect.fail;

/** Define a typed application error constructor. */
export const error = <const Name extends string>(name: Name): ErrorFactory<Name> =>
  Object.assign(
    <Fields extends object = {}>() =>
      (fields: Fields): FxError<Name, Fields> => ({ ...fields, _tag: name }),
    { type: name },
  );

/** Define a family of typed application error constructors. */
export const errors = <Spec extends Record<string, object>>(): ErrorConstructors<Spec> =>
  new Proxy(
    {},
    {
      get: (_target, property) => {
        if (typeof property !== "string") {
          return undefined;
        }

        return Object.assign((fields: object = {}) => ({ ...fields, _tag: property }), {
          type: property,
        });
      },
    },
  ) as ErrorConstructors<Spec>;

type TryOptions<A, E> = {
  try: (signal: AbortSignal) => A | PromiseLike<A>;
  catch: (e: unknown) => E;
};

/** Wrap sync or async code that might throw/reject into an async-safe Task. */
export const _try = <A, E>(options: TryOptions<A, E>): Task<A, E> =>
  Effect.tryPromise({
    try: (signal) => Promise.resolve(options.try(signal)),
    catch: options.catch,
  });

/** Wrap a synchronous function that might throw into a Task. */
export const trySync = <A, E>(options: { try: () => A; catch: (e: unknown) => E }): Task<A, E> =>
  Effect.try(options);
