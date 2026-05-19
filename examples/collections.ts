import { fx } from "../src/index";

const parseNumber = (input: string) =>
  fx.try({
    try: () => Number.parseInt(input, 10),
    catch: (cause) => ({ _tag: "ParseError" as const, cause }),
  });

const double = (n: number) => fx.succeed(n * 2);

const inputs = ["1", "2", "3"] as const;

const sequential = fx.task(function* () {
  const numbers = yield* fx.each(inputs, (input) => parseNumber(input));
  return yield* fx.sequence(numbers.map(double));
});

const unboundedParallel = fx.task(function* () {
  const numbers = yield* fx.each(inputs, (input) => parseNumber(input), {
    concurrency: true,
  });

  return yield* fx.sequence(numbers.map(double), {
    concurrency: true,
  });
});

const boundedParallel = fx.task(function* () {
  const numbers = yield* fx.each(inputs, (input) => parseNumber(input), {
    concurrency: 2,
  });

  return yield* fx.sequence(numbers.map(double), {
    concurrency: 2,
  });
});

const batched = fx.task(function* () {
  const numbers = yield* fx.eachBatch(inputs, 2, (input) => parseNumber(input), {
    concurrency: 2,
  });

  return yield* fx.sequence(numbers.map(double), {
    concurrency: 2,
  });
});

export const main = fx.run(
  fx.task(function* () {
    return {
      sequential: yield* sequential,
      unboundedParallel: yield* unboundedParallel,
      boundedParallel: yield* boundedParallel,
      batched: yield* batched,
    };
  }),
);
