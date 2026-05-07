import { fx, type ErrorOf, type Task } from "../src/index";

interface User {
  readonly id: string;
  readonly name: string;
}

const AppError = fx.errors<{
  NotFound: { id: string };
  InvalidId: { id: string };
}>();

type NotFound = ErrorOf<typeof AppError.NotFound>;
type InvalidId = ErrorOf<typeof AppError.InvalidId>;

const validateId = (id: string): Task<string, InvalidId> =>
  fx.task(function* () {
    yield* fx.ensure(id.length > 0, () => AppError.InvalidId({ id }));
    return id;
  });

const fetchUser = (id: string): Task<User, NotFound> =>
  fx.require(id === "1" ? { id, name: "Ada" } : null, () => AppError.NotFound({ id }));

const loadUser = (id: string) =>
  fx.task(function* () {
    const validId = yield* validateId(id);
    return yield* fetchUser(validId);
  });

const nullableUser = (id: string) =>
  fx.recoverErrors(loadUser(id), {
    NotFound: () => fx.succeed(null),
  });

const message = (id: string) =>
  fx.match(nullableUser(id), {
    onFailure: (error) => `Invalid user id: ${error.id}`,
    onSuccess: (user) => (user === null ? "User not found" : `Hello ${user.name}`),
  });

const result = fx.either(loadUser("2"));

export const main = fx.run(
  fx.task(function* () {
    yield* fx.log(yield* message("1"));
    return yield* result;
  }),
);
