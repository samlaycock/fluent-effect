import { fx } from "../src/index";

interface User {
  readonly id: string;
  readonly name: string;
}

interface UserApi {
  readonly fetchUser: (id: string, signal: AbortSignal) => Promise<User>;
}

const AppError = fx.errors<{
  NetworkError: { cause: unknown };
  TimeoutError: { operation: string };
}>();

const UserApi = fx.dependency<UserApi>("UserApi");

const fetchUser = (id: string) =>
  fx.task(function* () {
    const userApi = yield* fx.getDependency(UserApi);

    return yield* fx.try({
      try: (signal) => userApi.fetchUser(id, signal),
      catch: (cause) => AppError.NetworkError({ cause }),
    });
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

const testUserApi = fx.provideDependency(UserApi, {
  fetchUser: async (id) => ({ id, name: `User ${id}` }),
});

export const main = fx.runWith(loadUsers(["1", "2", "3"]), fx.dependencies(testUserApi));
