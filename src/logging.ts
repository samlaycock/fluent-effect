import { Effect, Tracer } from "effect";
import type { Task } from "./types.js";

/** Emit a structured info log line. */
export const log = (message: string, data?: Record<string, unknown>): Task<void> =>
  data ? Effect.logInfo(message, data) : Effect.logInfo(message);

/** Emit a structured warning log line. */
export const logWarn = (message: string, data?: Record<string, unknown>): Task<void> =>
  data ? Effect.logWarning(message, data) : Effect.logWarning(message);

/** Emit a structured error log line. */
export const logError = (message: string, data?: Record<string, unknown>): Task<void> =>
  data ? Effect.logError(message, data) : Effect.logError(message);

/** Wrap a Task in a tracing span. */
export const span = <A, E, R>(self: Task<A, E, R>, name: string, options?: Tracer.SpanOptions) =>
  Effect.withSpan(self, name, options);

/** Wrap a Task in a tracing span. */
export const trace = span;
