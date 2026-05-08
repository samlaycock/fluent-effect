import { fx, type ErrorOf, type Task } from "../src/index";

interface User {
  readonly id: string;
  readonly name: string;
}

const AppError = fx.errors<{
  NotFound: { id: string };
}>();

type NotFound = ErrorOf<typeof AppError.NotFound>;

interface Users {
  readonly findById: (id: string) => Task<User, NotFound>;
}

interface AuditLog {
  readonly record: (message: string, data?: Record<string, unknown>) => Task<void>;
}

const Users = fx.dependency<Users>("Users");
const AuditLog = fx.dependency<AuditLog>("AuditLog");

const loadUser = (id: string) =>
  fx.task(function* () {
    const { users, audit } = yield* fx.getDependency({
      users: Users,
      audit: AuditLog,
    });

    yield* audit.record("Loading user", { id });
    const user = yield* users.findById(id);
    yield* audit.record("Loaded user", { id: user.id });

    return user;
  });

const testUsers = fx.provideDependency(Users, {
  findById: (id) =>
    id === "1" ? fx.succeed({ id, name: "Ada" }) : fx.fail(AppError.NotFound({ id })),
});

// Use provideDependencyTask when the dependency implementation is built by a Task.
const consoleAudit = fx.provideDependencyTask(
  AuditLog,
  fx.succeed({
    record: (message, data) => fx.log(message, data),
  } satisfies AuditLog),
);

const dependencies = fx.dependencies(testUsers, consoleAudit);

const app = fx.app(dependencies);

export const main = app.run(loadUser("1"));
