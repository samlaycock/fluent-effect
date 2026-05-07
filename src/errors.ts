import { Effect } from "effect";
import { ok } from "./builders.js";
import type { Task } from "./types.js";

/** Alias: recover from any typed failure, returning a fallback Task. */
export const recover = Effect.catchAll;

/** Alias: recover from a specific tagged error only. */
export const recoverTag = Effect.catchTag;

/** Alias kept for readability at call sites. */
export const recoverFrom = recoverTag;

/** Helper: recover from one or more typed application errors. */
export const recoverErrors = Effect.catchTags;

/** Alias: match on success and failure with separate handlers. */
export const match = Effect.match;

/** Alias: convert a failing Task into one that succeeds with Either<E, A>. */
export const either = Effect.either;

/** Alias: fall back to another Task if this one fails. */
export const orElse = Effect.orElse;

/** Require a condition to be true, otherwise fail with a typed error. */
export const ensure = <E>(condition: boolean, onFalse: () => E): Task<void, E> =>
  condition ? ok(undefined) : Effect.fail(onFalse());

/** Require a value to be present, otherwise fail with a typed error. */
export const require = <A, E>(value: A, onMissing: () => E): Task<NonNullable<A>, E> =>
  value === null || value === undefined ? Effect.fail(onMissing()) : ok(value as NonNullable<A>);

/** Helper: replace failure with null. */
export const orNull = <A, E, R>(self: Task<A, E, R>): Task<A | null, never, R> =>
  Effect.catchAll(self, () => ok(null));

/** Helper: replace failure with undefined. */
export const orUndefined = <A, E, R>(self: Task<A, E, R>): Task<A | undefined, never, R> =>
  Effect.catchAll(self, () => ok(undefined));
