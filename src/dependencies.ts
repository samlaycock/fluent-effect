import { Context, Effect, Layer } from "effect";

import type { Task } from "./types.js";

type DependencyMap = Record<PropertyKey, Context.Tag<any, any>>;

type DependencyId<T> = T extends Context.Tag<infer I, any> ? I : never;

type DependencyValue<T> = T extends Context.Tag<any, infer S> ? S : never;

type DependencyMapContext<Deps extends DependencyMap> = {
  [K in keyof Deps]: DependencyId<Deps[K]>;
}[keyof Deps];

type DependencyMapValues<Deps extends DependencyMap> = {
  readonly [K in keyof Deps]: DependencyValue<Deps[K]>;
};

/** Define a service tag. Native usage remains `yield* ServiceTag`. */
export const service = Context.GenericTag;

/** Define an application dependency. Native usage remains `yield* Dependency`. */
export const dependency = service;

/** Pull one dependency from the current context. */
export function getDependency<I, S>(tag: Context.Tag<I, S>): Task<S, never, I>;
/** Pull several dependencies from the current context as a named object. */
export function getDependency<const Deps extends DependencyMap>(
  deps: Deps,
): Task<DependencyMapValues<Deps>, never, DependencyMapContext<Deps>>;
export function getDependency<I, S, const Deps extends DependencyMap>(
  tagOrDeps: Context.Tag<I, S> | Deps,
): Task<S, never, I> | Task<DependencyMapValues<Deps>, never, DependencyMapContext<Deps>> {
  if (Context.isTag(tagOrDeps)) {
    return Effect.contextWith((context: Context.Context<I>) => Context.get(context, tagOrDeps));
  }

  return getDependencies(tagOrDeps as Deps);
}

/** Pull several dependencies from the current context as a named object. */
export const getDependencies = <const Deps extends DependencyMap>(
  deps: Deps,
): Task<DependencyMapValues<Deps>, never, DependencyMapContext<Deps>> =>
  Effect.contextWith((context: Context.Context<DependencyMapContext<Deps>>) => {
    const entries = Reflect.ownKeys(deps).map((key) => {
      const tag = deps[key as keyof Deps] as Context.Tag<any, any>;

      return [key, Context.get(context, tag)];
    });

    return Object.fromEntries(entries) as DependencyMapValues<Deps>;
  });

/** Build a Layer whose service implementation is created by a Task. */
export const layer = <I, S, E, R>(
  tag: Context.Tag<I, S>,
  effect: Task<S, E, R>,
): Layer.Layer<I, E, R> => Layer.effect(tag, effect);

/** Build a Layer that provides a service from a plain value. */
export const layerSync = <I, S>(tag: Context.Tag<I, S>, impl: S): Layer.Layer<I> =>
  Layer.succeed(tag, impl);

/** Provide a dependency implementation from a plain value. */
export function provideDependency<I, S>(tag: Context.Tag<I, S>, impl: S): Layer.Layer<I>;
export function provideDependency<I, S>(tag: Context.Tag<I, S>, impl: S): Layer.Layer<I> {
  return Layer.succeed(tag, impl);
}

/** Provide a dependency implementation from a Task. */
export const provideDependencyTask = layer;

/** Build a dependency provider from a plain value. */
export const dependencyValue = provideDependency;

/** Build a dependency provider from a Task. */
export const dependencyTask = provideDependencyTask;

/** Alias: provide a service implementation directly to a Task. */
export const use = Effect.provideService;

/** Provide one dependency implementation directly to a Task. */
export function withDependency<A, E, R, I, S>(
  self: Task<A, E, R>,
  tag: Context.Tag<I, S>,
  impl: S,
): Task<A, E, Exclude<R, I>>;
export function withDependency<A, E, R, ROut, E2, RIn>(
  self: Task<A, E, R>,
  dependencyEnvironment: Layer.Layer<ROut, E2, RIn>,
): Task<A, E | E2, RIn | Exclude<R, ROut>>;
export function withDependency<A, E, R, I, S, ROut, E2, RIn>(
  self: Task<A, E, R>,
  tagOrDependencyEnvironment: Context.Tag<I, S> | Layer.Layer<ROut, E2, RIn>,
  impl?: S,
) {
  return impl === undefined
    ? Effect.provide(self, tagOrDependencyEnvironment as Layer.Layer<ROut, E2, RIn>)
    : Effect.provideService(self, tagOrDependencyEnvironment as Context.Tag<I, S>, impl);
}

/** Alias: provide a Layer, Context, Runtime, or ManagedRuntime to a Task. */
export const provide = Effect.provide;

/** Bundle dependency providers into one dependency environment. */
export const dependencies = Layer.mergeAll;

/** Run a Task with a dependency environment. */
export const withDependencies = withDependency;

/** Alias: merge two layers concurrently. */
export const mergeLayers = Layer.merge;

/** Alias: merge many layers concurrently. */
export const mergeAllLayers = Layer.mergeAll;
