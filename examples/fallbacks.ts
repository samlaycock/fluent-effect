import { fx } from "../src/index";

const AppError = fx.errors<{
  NotFound: { id: string };
  InvalidId: { id: string };
}>();

const findUser = (id: string) =>
  fx.task(function* () {
    yield* fx.ensure(id.length > 0, () => AppError.InvalidId({ id }));

    return yield* fx.require(id === "1" ? { id, name: "Ada" } : undefined, () =>
      AppError.NotFound({ id }),
    );
  });

const nullableUser = fx.orNull(findUser("2"));
const optionalUser = fx.orUndefined(findUser("2"));
const fallbackUser = fx.orElse(findUser("2"), () =>
  fx.succeed({ id: "fallback", name: "Fallback" }),
);
const result = fx.either(findUser(""));

export const main = fx.run(
  fx.task(function* () {
    return {
      nullableUser: yield* nullableUser,
      optionalUser: yield* optionalUser,
      fallbackUser: yield* fallbackUser,
      result: yield* result,
    };
  }),
);
