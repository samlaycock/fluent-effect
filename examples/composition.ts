import { fx } from "../src/index";

interface User {
  readonly id: string;
  readonly name: string;
}

const AppError = fx.errors<{
  NotFound: { id: string };
}>();

const findUser = (id: string) =>
  id === "1" ? fx.succeed({ id, name: "Ada" }) : fx.fail(AppError.NotFound({ id }));

const greet = (user: User) => fx.succeed(`Hello ${user.name}`);

const greeting = fx.andThen(
  fx.onSuccess(
    fx.onFailure(findUser("1"), (error) => fx.logWarn("Failed to find user", { id: error.id })),
    (user) => fx.log("Found user", { id: user.id }),
  ),
  greet,
);

export const main = fx.run(greeting);
