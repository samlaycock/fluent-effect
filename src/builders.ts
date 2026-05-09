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

type ErrorSpec<Spec extends Record<string, object>> = {
  readonly [Name in keyof Spec & string]: unknown;
};

const errorConstructor = (property: string) =>
  Object.assign((fields: object = {}) => ({ ...fields, _tag: property }), {
    type: property,
  });

/** Define a family of typed application error constructors. */
export const errors = <Spec extends Record<string, object>>(
  spec?: ErrorSpec<Spec>,
): ErrorConstructors<Spec> => {
  const constructors = new Map<string, ReturnType<typeof errorConstructor>>();
  const knownProperties = new Set(Object.keys(spec ?? {}));
  const getConstructor = (property: string) => {
    const existing = constructors.get(property);

    if (existing) {
      return existing;
    }

    const constructor = errorConstructor(property);
    constructors.set(property, constructor);

    return constructor;
  };

  return new Proxy(
    {},
    {
      get: (_target, property) => {
        if (typeof property !== "string") {
          return undefined;
        }

        return getConstructor(property);
      },
      getOwnPropertyDescriptor: (_target, property) => {
        if (typeof property !== "string" || !knownProperties.has(property)) {
          return undefined;
        }

        return {
          configurable: true,
          enumerable: true,
          value: getConstructor(property),
          writable: false,
        };
      },
      has: (_target, property) => typeof property === "string" && knownProperties.has(property),
      ownKeys: () => [...knownProperties],
    },
  ) as ErrorConstructors<Spec>;
};

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
