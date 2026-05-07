import { fx } from "../src/index";

interface User {
  readonly id: string;
  readonly name: string;
}

const AppError = fx.errors<{
  NetworkError: { cause: unknown };
  TimeoutError: { operation: string };
}>();

const fetchUser = (id: string) =>
  fx.try({
    try: async (signal) => {
      const response = await fetch(`https://example.com/users/${id}`, { signal });
      return (await response.json()) as User;
    },
    catch: (cause) => AppError.NetworkError({ cause }),
  });

const loadUser = (id: string) =>
  fx.trace(
    fx.timeout(
      fx.retry(fetchUser(id), {
        backoff: "100 millis",
        factor: 2,
        times: 3,
      }),
      "5 seconds",
      () => AppError.TimeoutError({ operation: "load-user" }),
    ),
    "load-user",
    { attributes: { id } },
  );

const loadUsers = (ids: readonly string[]) =>
  fx.task(function* () {
    yield* fx.log("Starting user import", { count: ids.length });

    const users = yield* fx.sequence(
      ids.map((id) => loadUser(id)),
      { concurrency: 5 },
    );

    yield* fx.log("Finished user import", { count: users.length });

    return users;
  });

export const main = fx.run(loadUsers(["1", "2", "3"]));
