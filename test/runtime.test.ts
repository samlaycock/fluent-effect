import { describe, expect, test } from "bun:test";

import { Deferred, Effect, Fiber, Layer, Ref } from "../src/effect";
import { fx, type ErrorsOf, type Task } from "../src/index";

const makeInterruptibleTask = (
  startedCount: Ref.Ref<number>,
  finalizedCount: Ref.Ref<number>,
  allStarted: Deferred.Deferred<void>,
  allFinalized: Deferred.Deferred<void>,
  expectedStarted: number,
) =>
  Effect.acquireUseRelease(
    Ref.updateAndGet(startedCount, (count) => count + 1).pipe(
      Effect.tap((count) =>
        count === expectedStarted ? Deferred.succeed(allStarted, undefined) : Effect.void,
      ),
    ),
    () => Effect.never,
    () =>
      Ref.updateAndGet(finalizedCount, (count) => count + 1).pipe(
        Effect.tap((count) =>
          count === expectedStarted ? Deferred.succeed(allFinalized, undefined) : Effect.void,
        ),
      ),
  );

const expectParentInterruptFinalizesStartedChildren = (
  expectedStarted: number,
  makeProgram: (task: Task<never, never, never>) => Task<unknown, unknown, never>,
) =>
  fx.run(
    Effect.gen(function* () {
      const startedCount = yield* Ref.make(0);
      const finalizedCount = yield* Ref.make(0);
      const allStarted = yield* Deferred.make<void>();
      const allFinalized = yield* Deferred.make<void>();
      const task = makeInterruptibleTask(
        startedCount,
        finalizedCount,
        allStarted,
        allFinalized,
        expectedStarted,
      );

      const fiber = yield* Effect.fork(makeProgram(task));

      yield* Deferred.await(allStarted);
      yield* Effect.timeoutFail(
        Fiber.interrupt(fiber).pipe(Effect.zipRight(Deferred.await(allFinalized))),
        {
          duration: "1 second",
          onTimeout: () =>
            new Error(
              `Timed out waiting for ${expectedStarted} started child task(s) to finalize after parent interruption`,
            ),
        },
      );

      return {
        finalized: yield* Ref.get(finalizedCount),
        started: yield* Ref.get(startedCount),
      };
    }),
  );

describe("fx runtime behavior", () => {
  test("fx.try catches synchronous throws", async () => {
    const AppError = fx.errors<{ Boom: { cause: unknown } }>();

    const result = await fx.run(
      fx.recoverErrors(
        fx.try({
          try: () => {
            throw new Error("boom");
          },
          catch: (cause) => AppError.Boom({ cause }),
        }),
        {
          Boom: (error) => fx.succeed(error._tag),
        },
      ),
    );

    expect(result).toBe("Boom");
  });

  test("fx.try catches rejected promises", async () => {
    const AppError = fx.errors<{ NetworkError: { cause: unknown } }>();

    const result = await fx.run(
      fx.recoverErrors(
        fx.try({
          try: async () => {
            throw new Error("offline");
          },
          catch: (cause) => AppError.NetworkError({ cause }),
        }),
        {
          NetworkError: (error) => fx.succeed(error._tag),
        },
      ),
    );

    expect(result).toBe("NetworkError");
  });

  test("fx.require fails on null and can be recovered by tag", async () => {
    const AppError = fx.errors<{ Missing: { field: string } }>();

    const result = await fx.run(
      fx.recoverErrors(
        fx.require(null as string | null, () => AppError.Missing({ field: "id" })),
        {
          Missing: (error) => fx.succeed(error.field),
        },
      ),
    );

    expect(result).toBe("id");
  });

  test("fx.runWith provides dependencies", async () => {
    interface Greeter {
      readonly greet: (name: string) => string;
    }

    const Greeter = fx.dependency<Greeter>("Greeter");

    const program = fx.task(function* () {
      const greeter = yield* fx.getDependency(Greeter);
      return greeter.greet("Ada");
    });

    const result = await fx.runWith(
      program,
      fx.provideDependency(Greeter, {
        greet: (name) => `Hello, ${name}`,
      }),
    );

    expect(result).toBe("Hello, Ada");
  });

  test("fx.getDependencies supports symbol-keyed dependency maps", async () => {
    interface Greeter {
      readonly greet: (name: string) => string;
    }

    const Greeter = fx.dependency<Greeter>("SymbolGreeter");
    const greeterKey = Symbol("greeter");

    const program = fx.task(function* () {
      const dependencies = yield* fx.getDependencies({
        [greeterKey]: Greeter,
      });

      return dependencies[greeterKey].greet("Ada");
    });

    const result = await fx.runWith(
      program,
      fx.provideDependency(Greeter, {
        greet: (name) => `Hello, ${name}`,
      }),
    );

    expect(result).toBe("Hello, Ada");
  });

  test("fx.each is sequential by default", async () => {
    let active = 0;
    let maxActive = 0;

    const result = await fx.run(
      fx.each([1, 2, 3], (n) =>
        fx.task(function* () {
          active += 1;
          maxActive = Math.max(maxActive, active);
          yield* Effect.sleep("5 millis");
          active -= 1;
          return n;
        }),
      ),
    );

    expect(result).toEqual([1, 2, 3]);
    expect(maxActive).toBe(1);
  });

  test("fx.eachParallel runs work concurrently", async () => {
    let active = 0;
    let maxActive = 0;

    const result = await fx.run(
      fx.eachParallel([1, 2, 3], (n) =>
        fx.task(function* () {
          active += 1;
          maxActive = Math.max(maxActive, active);
          yield* Effect.sleep("10 millis");
          active -= 1;
          return n;
        }),
      ),
    );

    expect(result).toEqual([1, 2, 3]);
    expect(maxActive).toBeGreaterThan(1);
  });

  test("fx.eachDiscard runs effects and does not collect results", async () => {
    const seen: number[] = [];

    const result = await fx.run(
      fx.eachDiscard([1, 2, 3], (n) =>
        fx.sync(() => {
          seen.push(n);
          return n * 2;
        }),
      ),
    );

    expect(result).toBeUndefined();
    expect(seen).toEqual([1, 2, 3]);
  });

  test("fx.eachDiscardParallel runs discarded work concurrently", async () => {
    let active = 0;
    let maxActive = 0;
    const seen: number[] = [];

    const result = await fx.run(
      fx.eachDiscardParallel([1, 2, 3], (n) =>
        fx.task(function* () {
          active += 1;
          maxActive = Math.max(maxActive, active);
          yield* Effect.sleep("10 millis");
          seen.push(n);
          active -= 1;
          return n;
        }),
      ),
    );

    expect(result).toBeUndefined();
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(maxActive).toBeGreaterThan(1);
  });

  test("fx.retryTimes retries failed tasks", async () => {
    let attempts = 0;

    const result = await fx.run(
      fx.retryTimes(
        fx.trySync({
          try: () => {
            attempts += 1;
            if (attempts < 3) {
              throw new Error("not yet");
            }
            return "ok";
          },
          catch: (cause) => cause,
        }),
        3,
      ),
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  test("fx.timeoutFail converts slow tasks to typed failures", async () => {
    const AppError = fx.errors<{ TimedOut: {} }>();

    const result = await fx.run(
      fx.recoverErrors(
        fx.timeoutFail(Effect.sleep("50 millis"), "1 millis", () => AppError.TimedOut({})),
        {
          TimedOut: (error) => fx.succeed(error._tag),
        },
      ),
    );

    expect(result).toBe("TimedOut");
  });

  test("fx.ensure succeeds when the condition is true", async () => {
    const AppError = fx.errors<{ Invalid: {} }>();

    const result = await fx.run(
      fx.task(function* () {
        yield* fx.ensure(true, () => AppError.Invalid({}));
        return "valid";
      }),
    );

    expect(result).toBe("valid");
  });

  test("fx.orNull and fx.orUndefined turn failures into fallback values", async () => {
    const AppError = fx.errors<{ Missing: {} }>();

    const [nullResult, undefinedResult] = await fx.run(
      fx.sequence([
        fx.orNull(fx.fail(AppError.Missing({}))),
        fx.orUndefined(fx.fail(AppError.Missing({}))),
      ] as const),
    );

    expect(nullResult).toBeNull();
    expect(undefinedResult).toBeUndefined();
  });

  test("fx.orElse falls back to another task after failure", async () => {
    const AppError = fx.errors<{ PrimaryFailed: {} }>();

    const result = await fx.run(
      fx.orElse(fx.fail(AppError.PrimaryFailed({})), () => fx.succeed("fallback")),
    );

    expect(result).toBe("fallback");
  });

  test("fx.eachLimit respects bounded concurrency", async () => {
    let active = 0;
    let maxActive = 0;

    const result = await fx.run(
      fx.eachLimit([1, 2, 3, 4, 5], 2, (n) =>
        fx.task(function* () {
          active += 1;
          maxActive = Math.max(maxActive, active);
          yield* Effect.sleep("10 millis");
          active -= 1;
          return n * 2;
        }),
      ),
    );

    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(maxActive).toBe(2);
  });

  test("fx.eachLimit rejects invalid bounded concurrency", () => {
    const invalidLimits = [0, -1, Number.NaN, 1.5];

    for (const concurrency of invalidLimits) {
      expect(() => fx.eachLimit([1], concurrency, (n) => fx.succeed(n))).toThrow(RangeError);
      expect(() => fx.eachLimit([1], concurrency, (n) => fx.succeed(n))).toThrow(
        "bounded concurrency must be a positive finite integer",
      );
    }
  });

  test("fx.sequence preserves object shape", async () => {
    const result = await fx.run(
      fx.sequence({
        id: fx.succeed("1"),
        count: fx.succeed(2),
      }),
    );

    expect(result).toEqual({ id: "1", count: 2 });
  });

  test("fx.app provides reusable dependency wiring", async () => {
    interface Clock {
      readonly now: () => number;
    }

    const Clock = fx.dependency<Clock>("Clock");
    const app = fx.app(fx.provideDependency(Clock, { now: () => 123 }));

    const program = fx.task(function* () {
      const clock = yield* fx.getDependency(Clock);
      return clock.now();
    });

    expect(await app.run(program)).toBe(123);
    expect(await app.runExit(program)).toMatchObject({ _tag: "Success" });
  });

  test("fx.app reuses layer acquisition across runs", async () => {
    interface Counter {
      readonly value: number;
    }

    const Counter = fx.dependency<Counter>("Counter");
    let acquisitions = 0;
    const app = fx.app(
      Layer.effect(
        Counter,
        Effect.sync(() => {
          acquisitions += 1;
          return { value: acquisitions };
        }),
      ),
    );

    const program = fx.task(function* () {
      const counter = yield* fx.getDependency(Counter);
      return counter.value;
    });

    expect(await app.run(program)).toBe(1);
    expect(await app.run(program)).toBe(1);
    expect(acquisitions).toBe(1);
  });

  test("fx.app dispose releases scoped layer resources", async () => {
    interface Connection {
      readonly id: number;
    }

    const Connection = fx.dependency<Connection>("Connection");
    let releases = 0;
    const app = fx.app(
      Layer.scoped(
        Connection,
        Effect.acquireRelease(Effect.succeed({ id: 1 }), () =>
          Effect.sync(() => {
            releases += 1;
          }),
        ),
      ),
    );

    const program = fx.task(function* () {
      const connection = yield* fx.getDependency(Connection);
      return connection.id;
    });

    expect(await app.run(program)).toBe(1);
    expect(releases).toBe(0);

    await app.dispose();

    expect(releases).toBe(1);
  });

  test("fx.getDependency can retrieve several dependencies as a named object", async () => {
    interface Config {
      readonly prefix: string;
    }

    interface Counter {
      readonly next: () => number;
    }

    const Config = fx.dependency<Config>("Config");
    const Counter = fx.dependency<Counter>("Counter");

    const program = fx.task(function* () {
      const { config, counter } = yield* fx.getDependency({
        config: Config,
        counter: Counter,
      });

      return `${config.prefix}-${counter.next()}`;
    });

    const result = await fx.runWith(
      program,
      fx.dependencies(
        fx.provideDependency(Config, { prefix: "job" }),
        fx.provideDependency(Counter, { next: () => 7 }),
      ),
    );

    expect(result).toBe("job-7");
  });

  test("fx.provideDependency accepts Effect values as plain implementations", async () => {
    const EffectValue = fx.dependency<Task<string>>("EffectValue");

    const program = fx.task(function* () {
      const value = yield* fx.getDependency(EffectValue);
      return yield* value;
    });

    const result = await fx.runWith(
      program,
      fx.provideDependency(EffectValue, fx.succeed("plain-effect-value")),
    );

    expect(result).toBe("plain-effect-value");
  });

  test("fx.provideDependencyTask accepts task-built implementations", async () => {
    interface TokenStore {
      readonly token: string;
    }

    const TokenStore = fx.dependency<TokenStore>("TokenStore");

    const program = fx.task(function* () {
      const store = yield* fx.getDependency(TokenStore);
      return store.token;
    });

    const result = await fx.runWith(
      program,
      fx.provideDependencyTask(TokenStore, fx.succeed({ token: "secret" })),
    );

    expect(result).toBe("secret");
  });

  test("fx.recoverTag only handles the matching tagged failure", async () => {
    const AppError = fx.errors<{
      NotFound: { id: string };
      Unauthorized: {};
    }>();

    const recovered = await fx.run(
      fx.recoverTag(fx.fail(AppError.NotFound({ id: "1" })), "NotFound", (error) =>
        fx.succeed(error.id),
      ),
    );

    const unauthorized: Task<never, ErrorsOf<typeof AppError>> = fx.fail(AppError.Unauthorized({}));

    const unrecovered = await fx.runExit(
      fx.recoverTag(unauthorized, "NotFound", (error) => fx.succeed(error.id)),
    );

    expect(recovered).toBe("1");
    expect(unrecovered._tag).toBe("Failure");
  });

  test("fx.match handles success and failure branches", async () => {
    const AppError = fx.errors<{ Invalid: { reason: string } }>();

    const success = await fx.run(
      fx.match(fx.succeed(2), {
        onFailure: () => "failed",
        onSuccess: (value) => `ok:${value}`,
      }),
    );

    const failure = await fx.run(
      fx.match(fx.fail(AppError.Invalid({ reason: "bad" })), {
        onFailure: (error) => error.reason,
        onSuccess: () => "ok",
      }),
    );

    expect(success).toBe("ok:2");
    expect(failure).toBe("bad");
  });

  test("fx.either exposes failures as values", async () => {
    const AppError = fx.errors<{ Invalid: { reason: string } }>();

    const result = await fx.run(fx.either(fx.fail(AppError.Invalid({ reason: "bad" }))));

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left.reason).toBe("bad");
    }
  });

  test("fx.runSafe returns failed exits instead of rejecting", async () => {
    const AppError = fx.errors<{ Boom: {} }>();

    const result = await fx.runSafe(fx.fail(AppError.Boom({})));

    expect(result._tag).toBe("Failure");
  });

  test("fx.try receives an AbortSignal that is aborted on interruption", async () => {
    let signalWasAborted = false;

    await fx.runExit(
      fx.timeoutFail(
        fx.try({
          try: (signal) =>
            new Promise<never>((_resolve, reject) => {
              signal.addEventListener("abort", () => {
                signalWasAborted = signal.aborted;
                reject(new Error("aborted"));
              });
            }),
          catch: (cause) => cause,
        }),
        "1 millis",
        () => "timed out",
      ),
    );

    expect(signalWasAborted).toBe(true);
  });

  test("fx.acquireUseRelease releases resources after success", async () => {
    const events: string[] = [];

    const result = await fx.run(
      fx.acquireUseRelease(
        fx.sync(() => {
          events.push("acquire");
          return "resource";
        }),
        (resource) =>
          fx.sync(() => {
            events.push(`use:${resource}`);
            return "done";
          }),
        (resource, exit) =>
          fx.sync(() => {
            events.push(`release:${resource}:${exit._tag}`);
          }),
      ),
    );

    expect(result).toBe("done");
    expect(events).toEqual(["acquire", "use:resource", "release:resource:Success"]);
  });

  test("fx.acquireUseRelease releases resources after failure", async () => {
    const AppError = fx.errors<{ Boom: { message: string } }>();
    const events: string[] = [];

    const result = await fx.runExit(
      fx.acquireUseRelease(
        fx.sync(() => {
          events.push("acquire");
          return "resource";
        }),
        (resource) =>
          fx.task(function* () {
            events.push(`use:${resource}`);
            return yield* fx.fail(AppError.Boom({ message: "bad" }));
          }),
        (resource, exit) =>
          fx.sync(() => {
            events.push(`release:${resource}:${exit._tag}`);
          }),
      ),
    );

    expect(result._tag).toBe("Failure");
    expect(events).toEqual(["acquire", "use:resource", "release:resource:Failure"]);
  });

  test("fx.bracket releases resources after interruption", async () => {
    const result = await fx.run(
      Effect.gen(function* () {
        const released = yield* Deferred.make<void>();

        const fiber = yield* Effect.fork(
          fx.bracket(
            fx.succeed("resource"),
            () => Effect.never,
            (resource, exit) =>
              fx
                .sync(() => {
                  expect(resource).toBe("resource");
                  expect(exit._tag).toBe("Failure");
                })
                .pipe(Effect.zipRight(Deferred.succeed(released, undefined))),
          ),
        );

        yield* Effect.timeoutFail(
          Fiber.interrupt(fiber).pipe(Effect.zipRight(Deferred.await(released))),
          {
            duration: "1 second",
            onTimeout: () => new Error("Timed out waiting for interrupted bracket to release"),
          },
        );

        return "released";
      }),
    );

    expect(result).toBe("released");
  });

  test("fx.onSuccess and fx.onFailure run hooks without changing the original result", async () => {
    const AppError = fx.errors<{ Boom: { message: string } }>();
    const events: string[] = [];

    const success = await fx.run(
      fx.onSuccess(fx.succeed("value"), (value) =>
        fx.sync(() => {
          events.push(`success:${value}`);
        }),
      ),
    );

    const failure = await fx.runExit(
      fx.onFailure(fx.fail(AppError.Boom({ message: "bad" })), (error) =>
        fx.sync(() => {
          events.push(`failure:${error.message}`);
        }),
      ),
    );

    expect(success).toBe("value");
    expect(failure._tag).toBe("Failure");
    expect(events).toEqual(["success:value", "failure:bad"]);
  });

  test("fx.withDependency can provide a single dependency directly", async () => {
    interface Formatter {
      readonly format: (value: string) => string;
    }

    const Formatter = fx.dependency<Formatter>("Formatter");

    const program = fx.task(function* () {
      const formatter = yield* fx.getDependency(Formatter);
      return formatter.format("hello");
    });

    const result = await fx.run(
      fx.withDependency(program, Formatter, {
        format: (value) => value.toUpperCase(),
      }),
    );

    expect(result).toBe("HELLO");
  });

  test("fx.withDependency can provide undefined as a dependency value", async () => {
    const OptionalFlag = fx.dependency<undefined>("OptionalFlag");

    const program = fx.task(function* () {
      return yield* fx.getDependency(OptionalFlag);
    });

    const result = await fx.run(fx.withDependency(program, OptionalFlag, undefined));

    expect(result).toBeUndefined();
  });

  test("fx.parallelLimit respects bounded concurrency for task collections", async () => {
    let active = 0;
    let maxActive = 0;

    const makeTask = (n: number) =>
      fx.task(function* () {
        active += 1;
        maxActive = Math.max(maxActive, active);
        yield* Effect.sleep("10 millis");
        active -= 1;
        return n;
      });

    const result = await fx.run(
      fx.parallelLimit([makeTask(1), makeTask(2), makeTask(3), makeTask(4)], 2),
    );

    expect(result).toEqual([1, 2, 3, 4]);
    expect(maxActive).toBe(2);
  });

  test("fx.sequence interrupts the active sequential child", async () => {
    const result = await expectParentInterruptFinalizesStartedChildren(1, (task) =>
      fx.sequence([task, task, task]),
    );

    expect(result).toEqual({ finalized: 1, started: 1 });
  });

  test("fx.parallel interrupts all unbounded child tasks", async () => {
    const result = await expectParentInterruptFinalizesStartedChildren(3, (task) =>
      fx.parallel([task, task, task]),
    );

    expect(result).toEqual({ finalized: 3, started: 3 });
  });

  test("fx.eachLimit interrupts only started bounded child tasks", async () => {
    const result = await expectParentInterruptFinalizesStartedChildren(2, (task) =>
      fx.eachLimit([1, 2, 3, 4], 2, () => task),
    );

    expect(result).toEqual({ finalized: 2, started: 2 });
  });

  test("fx.eachDiscardParallel interrupts all discarded child tasks", async () => {
    const result = await expectParentInterruptFinalizesStartedChildren(3, (task) =>
      fx.eachDiscardParallel([1, 2, 3], () => task),
    );

    expect(result).toEqual({ finalized: 3, started: 3 });
  });

  test("fx.eachDiscardLimit respects bounded concurrency and discards results", async () => {
    let active = 0;
    let maxActive = 0;
    const seen: number[] = [];

    const result = await fx.run(
      fx.eachDiscardLimit([1, 2, 3, 4], 2, (n) =>
        fx.task(function* () {
          active += 1;
          maxActive = Math.max(maxActive, active);
          yield* Effect.sleep("10 millis");
          seen.push(n);
          active -= 1;
          return n;
        }),
      ),
    );

    expect(result).toBeUndefined();
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    expect(maxActive).toBe(2);
  });

  test("fx.parallelLimit rejects invalid bounded concurrency", () => {
    const invalidLimits = [0, -1, Number.NaN, 1.5];

    for (const concurrency of invalidLimits) {
      expect(() => fx.parallelLimit([fx.succeed(1)], concurrency)).toThrow(RangeError);
      expect(() => fx.parallelLimit([fx.succeed(1)], concurrency)).toThrow(
        "bounded concurrency must be a positive finite integer",
      );
    }
  });

  test("fx.eachDiscardLimit rejects invalid bounded concurrency", () => {
    const invalidLimits = [0, -1, Number.NaN, 1.5];

    for (const concurrency of invalidLimits) {
      expect(() => fx.eachDiscardLimit([1], concurrency, (n) => fx.succeed(n))).toThrow(RangeError);
      expect(() => fx.eachDiscardLimit([1], concurrency, (n) => fx.succeed(n))).toThrow(
        "bounded concurrency must be a positive finite integer",
      );
    }
  });

  test("fx.sequence rejects invalid bounded concurrency", () => {
    const invalidLimits = [0, -1, Number.NaN, 1.5];

    for (const concurrency of invalidLimits) {
      expect(() => fx.sequence([fx.succeed(1)], { concurrency })).toThrow(RangeError);
      expect(() => fx.sequence([fx.succeed(1)], { concurrency })).toThrow(
        "bounded concurrency must be a positive finite integer",
      );
    }
  });

  test("fx.runSync and fx.runExitSync execute synchronous tasks", () => {
    expect(fx.runSync(fx.sync(() => 42))).toBe(42);
    expect(fx.runExitSync(fx.succeed("ok"))).toMatchObject({ _tag: "Success" });
  });

  test("fx.error and fx.errors create tagged error values", () => {
    const ValidationErrorFactory = fx.error("ValidationError");
    const ValidationError = ValidationErrorFactory<{ field: string }>();
    const AppError = fx.errors<{ TimedOut: {}; NotFound: { id: string } }>();

    expect(ValidationErrorFactory.type).toBe("ValidationError");
    expect(ValidationError({ field: "email" })).toEqual({
      _tag: "ValidationError",
      field: "email",
    });

    expect(AppError.NotFound.type).toBe("NotFound");
    expect(AppError.NotFound({ id: "1" })).toEqual({
      _tag: "NotFound",
      id: "1",
    });

    expect(AppError.TimedOut.type).toBe("TimedOut");
    expect(AppError.TimedOut()).toEqual({
      _tag: "TimedOut",
    });
  });

  test("fx.errors exposes explicit runtime specs to reflection", () => {
    const AppError = fx.errors<{ TimedOut: {}; NotFound: { id: string } }>({
      NotFound: null,
      TimedOut: null,
    });

    expect(Object.keys(AppError)).toEqual(["NotFound", "TimedOut"]);
    expect("NotFound" in AppError).toBe(true);
    expect("Unknown" in AppError).toBe(false);
    expect({ ...AppError }).toEqual({
      NotFound: AppError.NotFound,
      TimedOut: AppError.TimedOut,
    });
    expect(AppError.NotFound({ id: "1" })).toEqual({
      _tag: "NotFound",
      id: "1",
    });
  });

  test("fx.errors without a runtime spec keeps lazy constructors undiscoverable", () => {
    const AppError = fx.errors<{ NotFound: { id: string } }>();

    expect(Object.keys(AppError)).toEqual([]);
    expect("NotFound" in AppError).toBe(false);
    expect({ ...(AppError as Record<string, unknown>) }).toEqual({});
    expect(AppError.NotFound({ id: "1" })).toEqual({
      _tag: "NotFound",
      id: "1",
    });
  });

  test("fx.trySync catches synchronous throws", async () => {
    const AppError = fx.errors<{ ParseError: { cause: unknown } }>();

    const result = await fx.run(
      fx.recoverErrors(
        fx.trySync({
          try: () => JSON.parse("not json"),
          catch: (cause) => AppError.ParseError({ cause }),
        }),
        {
          ParseError: (error) => fx.succeed(error._tag),
        },
      ),
    );

    expect(result).toBe("ParseError");
  });

  test("fx.ensure fails when the condition is false", async () => {
    const AppError = fx.errors<{ Invalid: { field: string } }>();

    const result = await fx.run(
      fx.recoverErrors(
        fx.ensure(false, () => AppError.Invalid({ field: "name" })),
        {
          Invalid: (error) => fx.succeed(error.field),
        },
      ),
    );

    expect(result).toBe("name");
  });

  test("fx.require returns present values", async () => {
    expect(fx.run(fx.require("present", () => "missing"))).resolves.toBe("present");
  });

  test("fx.map, fx.chain, and fx.when compose tasks", async () => {
    const mapped = fx.map(fx.succeed(1), (n) => n + 1);
    const chained = fx.chain(mapped, (n) => fx.succeed(n * 2));
    const branched = fx.when(true, {
      onTrue: () => chained,
      onFalse: () => fx.succeed(0),
    });

    expect(fx.run(branched)).resolves.toBe(4);
  });

  test("fx.parallel runs task collections concurrently", async () => {
    let active = 0;
    let maxActive = 0;

    const makeTask = (n: number) =>
      fx.task(function* () {
        active += 1;
        maxActive = Math.max(maxActive, active);
        yield* Effect.sleep("10 millis");
        active -= 1;
        return n;
      });

    const result = await fx.run(fx.parallel([makeTask(1), makeTask(2), makeTask(3)]));

    expect(result).toEqual([1, 2, 3]);
    expect(maxActive).toBeGreaterThan(1);
  });

  test("fx.retry supports simple times options", async () => {
    let attempts = 0;

    const result = await fx.run(
      fx.retry(
        fx.trySync({
          try: () => {
            attempts += 1;
            if (attempts < 2) {
              throw new Error("again");
            }
            return "done";
          },
          catch: (cause) => cause,
        }),
        { times: 2 },
      ),
    );

    expect(result).toBe("done");
    expect(attempts).toBe(2);
  });

  test("fx.retry rejects invalid times synchronously", () => {
    const task = fx.succeed("ok");

    for (const times of [-1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => fx.retry(task, { times })).toThrow(RangeError);
      expect(() => fx.retry(task, { times })).toThrow(
        "retry times must be a non-negative finite integer",
      );
    }
  });

  test("fx.retryTimes rejects invalid retry counts synchronously", () => {
    const task = fx.succeed("ok");

    for (const times of [-1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => fx.retryTimes(task, times)).toThrow(RangeError);
      expect(() => fx.retryTimes(task, times)).toThrow(
        "retry times must be a non-negative finite integer",
      );
    }
  });

  test("fx.retry treats empty options as zero retries", async () => {
    let attempts = 0;
    const error = new Error("again");

    const result = await fx.runResult(
      fx.retry(
        fx.trySync({
          try: () => {
            attempts += 1;
            throw error;
          },
          catch: (cause) => cause,
        }),
        {},
      ),
    );

    expect(result).toEqual({ ok: false, error });
    expect(attempts).toBe(1);
  });

  test("fx.retry rejects factor without backoff synchronously", () => {
    const task = fx.succeed("ok");
    const factorOnlyOptions = { factor: 2 } as never;

    expect(() => fx.retry(task, factorOnlyOptions)).toThrow(RangeError);
    expect(() => fx.retry(task, factorOnlyOptions)).toThrow(
      "retry factor requires backoff because factor only applies to exponential backoff schedules",
    );
  });

  test("fx.run rejects typed failures", async () => {
    const AppError = fx.errors<{ Boom: { message: string } }>();

    expect(fx.run(fx.fail(AppError.Boom({ message: "bad" })))).rejects.toBeDefined();
  });

  test("fx.runOrThrow throws the original typed failure", async () => {
    const AppError = fx.errors<{ Boom: { message: string } }>();
    const error = AppError.Boom({ message: "bad" });

    expect(fx.runOrThrow(fx.fail(error))).rejects.toBe(error);
  });

  test("fx.runOrThrow returns successful task values", async () => {
    const result = await fx.runOrThrow(fx.succeed("ok"));

    expect(result).toBe("ok");
  });

  test("fx.runResult returns plain success and failure values", async () => {
    const AppError = fx.errors<{ Boom: { message: string } }>();
    const error = AppError.Boom({ message: "bad" });

    const success = await fx.runResult(fx.succeed("ok"));
    const failure = await fx.runResult(fx.fail(error));

    expect(success).toEqual({ ok: true, value: "ok" });
    expect(failure).toEqual({ ok: false, error });
  });

  test("fx.runOrThrowSync and fx.runResultSync support synchronous boundaries", () => {
    const AppError = fx.errors<{ Boom: { message: string } }>();
    const error = AppError.Boom({ message: "bad" });

    expect(fx.runOrThrowSync(fx.succeed("ok"))).toBe("ok");
    expect(() => fx.runOrThrowSync(fx.fail(error))).toThrow(error);
    expect(fx.runResultSync(fx.succeed("ok"))).toEqual({ ok: true, value: "ok" });
    expect(fx.runResultSync(fx.fail(error))).toEqual({ ok: false, error });
  });

  test("fx.app.provide returns a provided task that can be run later", async () => {
    interface Env {
      readonly value: string;
    }

    const Env = fx.dependency<Env>("Env");
    const app = fx.app(fx.provideDependency(Env, { value: "provided" }));

    const program = fx.task(function* () {
      const env = yield* fx.getDependency(Env);
      return env.value;
    });

    expect(fx.run(app.provide(program))).resolves.toBe("provided");
  });

  test("fx.app exposes normal JavaScript boundary helpers", async () => {
    interface Env {
      readonly value: string;
    }

    const Env = fx.dependency<Env>("Env");
    const AppError = fx.errors<{ Boom: { message: string } }>();
    const error = AppError.Boom({ message: "bad" });
    const app = fx.app(fx.provideDependency(Env, { value: "provided" }));

    const success = fx.task(function* () {
      const env = yield* fx.getDependency(Env);
      return env.value;
    });

    expect(await app.runOrThrow(success)).toBe("provided");
    expect(await app.runResult(success)).toEqual({ ok: true, value: "provided" });

    try {
      await app.runOrThrow(fx.fail(error));
      throw new Error("Expected app.runOrThrow to throw");
    } catch (cause) {
      expect(cause).toBe(error);
    }

    expect(await app.runResult(fx.fail(error))).toEqual({ ok: false, error });
    expect(app.runOrThrowSync(success)).toBe("provided");
    expect(app.runResultSync(success)).toEqual({ ok: true, value: "provided" });
  });

  test("fx.app boundary helpers unwrap dependency layer failures", async () => {
    interface Env {
      readonly value: string;
    }

    const Env = fx.dependency<Env>("Env");
    const AppError = fx.errors<{ ConfigError: { message: string } }>();
    const error = AppError.ConfigError({ message: "missing config" });
    const app = fx.app(fx.layer(Env, fx.fail(error)));

    const program = fx.task(function* () {
      const env = yield* fx.getDependency(Env);
      return env.value;
    });

    expect(
      await app.runOrThrow(program).then(
        () => "unexpected success",
        (cause) => cause,
      ),
    ).toBe(error);
    expect(() => app.runOrThrowSync(program)).toThrow(error);
    expect(await app.runResult(program)).toEqual({ ok: false, error });
    expect(app.runResultSync(program)).toEqual({ ok: false, error });
  });

  test("fx.runWithOrThrow unwraps one-shot dependency layer failures", async () => {
    interface Env {
      readonly value: string;
    }

    const Env = fx.dependency<Env>("Env");
    const AppError = fx.errors<{ ConfigError: { message: string } }>();
    const error = AppError.ConfigError({ message: "missing config" });

    const program = fx.task(function* () {
      const env = yield* fx.getDependency(Env);
      return env.value;
    });

    expect(
      await fx.runWithOrThrow(program, fx.layer(Env, fx.fail(error))).then(
        () => "unexpected success",
        (cause) => cause,
      ),
    ).toBe(error);
  });

  test("fx.runWithResult returns one-shot dependency layer failures as results", async () => {
    interface Env {
      readonly value: string;
    }

    const Env = fx.dependency<Env>("Env");
    const AppError = fx.errors<{ ConfigError: { message: string } }>();
    const error = AppError.ConfigError({ message: "missing config" });

    const program = fx.task(function* () {
      const env = yield* fx.getDependency(Env);
      return env.value;
    });

    expect(await fx.runWithResult(program, fx.layer(Env, fx.fail(error)))).toEqual({
      ok: false,
      error,
    });
  });

  test("fx.timeout fails slow tasks with Effect's timeout error", async () => {
    const result = await fx.runExit(fx.timeout(Effect.sleep("20 millis"), "1 millis"));

    expect(result._tag).toBe("Failure");
  });

  test("fx.timeout returns the value for fast tasks without a typed timeout error", async () => {
    const result = await fx.run(fx.timeout(fx.succeed("fast"), "1 second"));

    expect(result).toBe("fast");
  });

  test("fx.retry with backoff options retries until success", async () => {
    let attempts = 0;

    const result = await fx.run(
      fx.retry(
        fx.trySync({
          try: () => {
            attempts += 1;
            if (attempts < 2) {
              throw new Error("again");
            }
            return "done";
          },
          catch: (cause) => cause,
        }),
        { backoff: "1 millis", times: 2 },
      ),
    );

    expect(result).toBe("done");
    expect(attempts).toBe(2);
  });

  test("fx.retryBackoff rejects invalid retry counts synchronously", () => {
    const task = fx.succeed("ok");

    for (const times of [-1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => fx.retryBackoff(task, { base: "100 millis", times })).toThrow(RangeError);
      expect(() => fx.retryBackoff(task, { base: "100 millis", times })).toThrow(
        "retry times must be a non-negative finite integer",
      );
    }
  });

  test("fx.retryBackoff accepts zero retries", async () => {
    let attempts = 0;
    const error = new Error("again");

    const result = await fx.runResult(
      fx.retryBackoff(
        fx.trySync({
          try: () => {
            attempts += 1;
            throw error;
          },
          catch: (cause) => cause,
        }),
        { base: "1 millis", times: 0 },
      ),
    );

    expect(result).toEqual({ ok: false, error });
    expect(attempts).toBe(1);
  });

  test("fx.layerSync and fx.mergeLayers provide multiple dependencies", async () => {
    interface Left {
      readonly value: string;
    }

    interface Right {
      readonly value: string;
    }

    const Left = fx.dependency<Left>("Left");
    const Right = fx.dependency<Right>("Right");

    const program = fx.task(function* () {
      const { left, right } = yield* fx.getDependency({
        left: Left,
        right: Right,
      });
      return `${left.value}:${right.value}`;
    });

    const result = await fx.runWith(
      program,
      fx.mergeLayers(fx.layerSync(Left, { value: "a" }), fx.layerSync(Right, { value: "b" })),
    );

    expect(result).toBe("a:b");
  });

  test("fx.dependencyValue and fx.dependencyTask aliases provide dependencies", async () => {
    interface A {
      readonly value: string;
    }

    interface B {
      readonly value: string;
    }

    const A = fx.dependency<A>("A");
    const B = fx.dependency<B>("B");

    const program = fx.task(function* () {
      const { a, b } = yield* fx.getDependency({ a: A, b: B });
      return `${a.value}-${b.value}`;
    });

    const result = await fx.runWith(
      program,
      fx.dependencies(
        fx.dependencyValue(A, { value: "value" }),
        fx.dependencyTask(B, fx.succeed({ value: "task" })),
      ),
    );

    expect(result).toBe("value-task");
  });

  test("fx.log helpers and fx.trace preserve task success", async () => {
    const result = await fx.run(
      fx.trace(
        fx.task(function* () {
          yield* fx.log("info", { ok: true });
          yield* fx.logWarn("warn");
          yield* fx.logError("error");
          return "logged";
        }),
        "test-span",
      ),
    );

    expect(result).toBe("logged");
  });

  test("fx.recover handles any typed failure", async () => {
    const AppError = fx.errors<{ Boom: { message: string } }>();

    const result = await fx.run(
      fx.recover(fx.fail(AppError.Boom({ message: "bad" })), (error) => fx.succeed(error.message)),
    );

    expect(result).toBe("bad");
  });

  test("fx.tap runs a side effect while preserving the original value", async () => {
    const events: string[] = [];

    const result = await fx.run(
      fx.tap(fx.succeed("original"), (value) =>
        fx.sync(() => {
          events.push(value);
        }),
      ),
    );

    expect(result).toBe("original");
    expect(events).toEqual(["original"]);
  });

  test("fx.all exposes native Effect.all behavior", async () => {
    const result = await fx.run(
      fx.all({
        one: fx.succeed(1),
        two: fx.succeed(2),
      }),
    );

    expect(result).toEqual({ one: 1, two: 2 });
  });

  test("fx.mergeAllLayers provides several dependencies", async () => {
    interface A {
      readonly value: string;
    }
    interface B {
      readonly value: string;
    }
    interface C {
      readonly value: string;
    }

    const A = fx.dependency<A>("MergeAllA");
    const B = fx.dependency<B>("MergeAllB");
    const C = fx.dependency<C>("MergeAllC");

    const program = fx.task(function* () {
      const { a, b, c } = yield* fx.getDependency({ a: A, b: B, c: C });
      return `${a.value}${b.value}${c.value}`;
    });

    const result = await fx.runWith(
      program,
      fx.mergeAllLayers(
        fx.provideDependency(A, { value: "a" }),
        fx.provideDependency(B, { value: "b" }),
        fx.provideDependency(C, { value: "c" }),
      ),
    );

    expect(result).toBe("abc");
  });

  test("fx.runSync throws for asynchronous tasks", () => {
    expect(() => fx.runSync(Effect.sleep("1 millis"))).toThrow();
  });
});
