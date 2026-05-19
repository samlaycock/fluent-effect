/**
 * fluent-effect — an ergonomic house dialect over Effect.
 *
 * Conventions:
 * - `<name>` is the async / effectful / general form.
 * - `<name>Sync` is the synchronous / plain-value constrained form.
 * - Aliases preserve native Effect semantics.
 * - Helpers add explicit, opinionated semantics where Effect defaults are easy
 *   to misread, especially around concurrency.
 */

import { Cause, Exit, pipe } from "effect";

import * as builders from "./builders.js";
import * as concurrency from "./concurrency.js";
import * as dependencies from "./dependencies.js";
import * as errors from "./errors.js";
import * as logging from "./logging.js";
import * as runtime from "./runtime.js";

export type {
  AnyTask,
  ErrorFactory,
  ErrorConstructor,
  ErrorConstructors,
  ErrorOf,
  ErrorInstance,
  ErrorInstances,
  ErrorsOf,
  FxError,
  Result,
  Task,
  TaskDeps,
  TaskError,
  TaskResult,
} from "./types.js";

export { Cause, Exit, pipe };

export const fx = {
  // Builders
  task: builders.task,
  ok: builders.ok,
  succeed: builders.succeed,
  sync: builders.sync,
  fromSync: builders.fromSync,
  fail: builders.fail,
  error: builders.error,
  errors: builders.errors,
  try: builders._try,
  trySync: builders.trySync,
  acquireUseRelease: builders.acquireUseRelease,
  bracket: builders.bracket,
  acquireRelease: builders.acquireRelease,
  scoped: builders.scoped,

  // Combinators
  map: concurrency.map,
  chain: concurrency.chain,
  andThen: concurrency.andThen,
  tap: concurrency.tap,
  onSuccess: concurrency.onSuccess,
  tapError: concurrency.tapError,
  onFailure: concurrency.onFailure,
  each: concurrency.each,
  eachDiscard: concurrency.eachDiscard,
  eachParallel: concurrency.eachParallel,
  eachDiscardParallel: concurrency.eachDiscardParallel,
  eachLimit: concurrency.eachLimit,
  eachBatch: concurrency.eachBatch,
  eachDiscardLimit: concurrency.eachDiscardLimit,
  all: concurrency.all,
  sequence: concurrency.sequence,
  parallel: concurrency.parallel,
  parallelLimit: concurrency.parallelLimit,
  when: concurrency.when,
  retry: concurrency.retry,
  retryTimes: concurrency.retryTimes,
  retryBackoff: concurrency.retryBackoff,
  timeout: concurrency.timeout,
  timeoutFail: concurrency.timeoutFail,
  timeoutOption: concurrency.timeoutOption,

  // Error handling
  recover: errors.recover,
  recoverTag: errors.recoverTag,
  recoverFrom: errors.recoverFrom,
  recoverErrors: errors.recoverErrors,
  match: errors.match,
  either: errors.either,
  orElse: errors.orElse,
  ensure: errors.ensure,
  require: errors.require,
  orNull: errors.orNull,
  orUndefined: errors.orUndefined,

  // Dependency injection / layers
  service: dependencies.service,
  dependency: dependencies.dependency,
  getDependency: dependencies.getDependency,
  getDependencies: dependencies.getDependencies,
  layer: dependencies.layer,
  layerSync: dependencies.layerSync,
  layerScoped: dependencies.layerScoped,
  provideDependency: dependencies.provideDependency,
  provideDependencyTask: dependencies.provideDependencyTask,
  dependencyValue: dependencies.dependencyValue,
  dependencyTask: dependencies.dependencyTask,
  use: dependencies.use,
  withDependency: dependencies.withDependency,
  provide: dependencies.provide,
  dependencies: dependencies.dependencies,
  withDependencies: dependencies.withDependencies,
  mergeLayers: dependencies.mergeLayers,
  mergeAllLayers: dependencies.mergeAllLayers,

  // Logging
  log: logging.log,
  logWarn: logging.logWarn,
  logError: logging.logError,
  span: logging.span,
  trace: logging.trace,

  // Execution
  run: runtime.run,
  runOrThrow: runtime.runOrThrow,
  runResult: runtime.runResult,
  runWith: runtime.runWith,
  runWithOrThrow: runtime.runWithOrThrow,
  runWithResult: runtime.runWithResult,
  app: runtime.app,
  runSync: runtime.runSync,
  runOrThrowSync: runtime.runOrThrowSync,
  runResultSync: runtime.runResultSync,
  runSafe: runtime.runSafe,
  runExit: runtime.runExit,
  runSafeSync: runtime.runSafeSync,
  runExitSync: runtime.runExitSync,
} as const;
