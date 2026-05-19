import { Effect } from "effect";

/** Re-export Effect's core type with a friendlier alias. */
export type Task<A, E = never, R = never> = Effect.Effect<A, E, R>;
export type AnyTask = Task<unknown, unknown, unknown>;

/** Infer the success type of a Task. */
export type TaskResult<T extends AnyTask> = Effect.Effect.Success<T>;
/** Infer the error type of a Task. */
export type TaskError<T extends AnyTask> = Effect.Effect.Error<T>;
/** Infer the requirements of a Task. */
export type TaskDeps<T extends AnyTask> = Effect.Effect.Context<T>;

export type Result<A, E> =
  | {
      readonly ok: true;
      readonly value: A;
    }
  | {
      readonly ok: false;
      readonly error: E;
    };

export type FxError<Name extends string, Fields extends object = {}> = Readonly<Fields> & {
  readonly _tag: Name;
};

export type ErrorFactory<Name extends string> = {
  <Fields extends object = {}>(): ErrorConstructor<Name, Fields>;
  readonly type: Name;
};

export type ErrorConstructor<Name extends string, Fields extends object = {}> = {
  (
    ...args: keyof Fields extends never ? [fields?: Fields] : [fields: Fields]
  ): FxError<Name, Fields>;
  readonly type: Name;
};

export type ErrorConstructors<Spec extends Record<string, object>> = {
  readonly [Name in keyof Spec & string]: ErrorConstructor<Name, Spec[Name]>;
};

export type ErrorOf<T> = T extends (...args: any) => infer E ? E : never;

export type ErrorInstance<T> = ErrorOf<T>;

export type ErrorInstances<T extends Record<PropertyKey, (...args: any) => any>> = {
  readonly [Name in keyof T]: ErrorOf<T[Name]>;
}[keyof T];

export type ErrorsOf<T extends Record<PropertyKey, (...args: any) => any>> = ErrorInstances<T>;
