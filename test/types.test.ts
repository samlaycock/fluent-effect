import { Effect, Either, Layer } from "../src/effect";
import {
  fx,
  type ErrorOf,
  type ErrorsOf,
  type Task,
  type TaskDeps,
  type TaskError,
  type TaskResult,
} from "../src/index";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type Expect<T extends true> = T;

interface User {
  readonly id: string;
  readonly name: string;
}

class NotFound {
  readonly _tag = "NotFound";
  constructor(readonly id: string) {}
}

class NetworkError {
  readonly _tag = "NetworkError";
  constructor(readonly cause: unknown) {}
}

const ValidationError = fx.error("ValidationError")<{ field: string }>();

type ValidationError = ReturnType<typeof ValidationError>;

const AppError = fx.errors<{
  TimedOut: {};
  NotFound: { id: string };
  InvalidInput: { field: string };
}>();

type AppNotFound = ErrorOf<typeof AppError.NotFound>;
type InvalidInput = ErrorOf<typeof AppError.InvalidInput>;
type AppErrors = ErrorsOf<typeof AppError>;

interface UserRepo {
  readonly findById: (id: string) => Task<User, NotFound>;
}

const UserRepo = fx.service<UserRepo>("UserRepo");
const Users = fx.dependency<UserRepo>("Users");

const user: User = { id: "1", name: "Ada" };

const getUser = fx.task(function* () {
  const repo = yield* UserRepo;
  return yield* repo.findById("1");
});

type _task_result = Expect<Equal<TaskResult<typeof getUser>, User>>;
type _task_error = Expect<Equal<TaskError<typeof getUser>, NotFound>>;
type _task_deps = Expect<Equal<TaskDeps<typeof getUser>, UserRepo>>;

const asyncWrapped = fx.try({
  try: async (_signal) => user,
  catch: (cause) => new NetworkError(cause),
});

const syncWrappedByTry = fx.try({
  try: () => user,
  catch: (cause) => new NetworkError(cause),
});

type _try_result = Expect<Equal<TaskResult<typeof asyncWrapped>, User>>;
type _try_error = Expect<Equal<TaskError<typeof asyncWrapped>, NetworkError>>;
type _try_deps = Expect<Equal<TaskDeps<typeof asyncWrapped>, never>>;
type _try_sync_work_result = Expect<Equal<TaskResult<typeof syncWrappedByTry>, User>>;
type _try_sync_work_error = Expect<Equal<TaskError<typeof syncWrappedByTry>, NetworkError>>;

const syncWrapped = fx.trySync({
  try: () => user,
  catch: (cause) => new NetworkError(cause),
});

type _try_sync_result = Expect<Equal<TaskResult<typeof syncWrapped>, User>>;
type _try_sync_error = Expect<Equal<TaskError<typeof syncWrapped>, NetworkError>>;

interface ReleaseAudit {
  readonly record: (message: string) => Task<void>;
}

const ReleaseAudit = fx.dependency<ReleaseAudit>("ReleaseAudit");

const resourceManaged = fx.acquireUseRelease(
  fx.trySync({
    try: () => ({ id: "resource" }),
    catch: (cause) => new NetworkError(cause),
  }),
  (resource) => (resource.id === user.id ? fx.ok(user) : fx.fail(new NotFound(resource.id))),
  (resource, exit) =>
    fx.task(function* () {
      const audit = yield* fx.getDependency(ReleaseAudit);
      yield* audit.record(`${resource.id}:${exit._tag}`);
    }),
);

const bracketManaged = fx.bracket(
  fx.ok({ id: "resource" }),
  (resource) => fx.ok(resource.id),
  () => fx.ok(undefined),
);

type _acquire_use_release_result = Expect<Equal<TaskResult<typeof resourceManaged>, User>>;
type _acquire_use_release_error = Expect<
  Equal<TaskError<typeof resourceManaged>, NetworkError | NotFound>
>;
type _acquire_use_release_deps = Expect<Equal<TaskDeps<typeof resourceManaged>, ReleaseAudit>>;
type _bracket_result = Expect<Equal<TaskResult<typeof bracketManaged>, string>>;
type _bracket_error = Expect<Equal<TaskError<typeof bracketManaged>, never>>;

const succeeded = fx.succeed(user);
const fromSync = fx.fromSync(() => user);

type _succeed_result = Expect<Equal<TaskResult<typeof succeeded>, User>>;
type _from_sync_result = Expect<Equal<TaskResult<typeof fromSync>, User>>;

const validationError = ValidationError({ field: "email" });
const timedOut = AppError.TimedOut();
const appNotFound = AppError.NotFound({ id: "1" });
const invalidInput = AppError.InvalidInput({ field: "email" });

// @ts-expect-error Non-empty error fields remain required.
AppError.NotFound();

type _error_factory_value = Expect<
  Equal<
    typeof validationError,
    import("../src/index").FxError<"ValidationError", { field: string }>
  >
>;

type _errors_timed_out_value = Expect<
  Equal<typeof timedOut, import("../src/index").FxError<"TimedOut">>
>;

type _errors_not_found_value = Expect<
  Equal<typeof appNotFound, import("../src/index").FxError<"NotFound", { id: string }>>
>;

type _errors_invalid_input_value = Expect<
  Equal<typeof invalidInput, import("../src/index").FxError<"InvalidInput", { field: string }>>
>;

type _error_instances_union = Expect<
  Equal<AppErrors, typeof timedOut | AppNotFound | InvalidInput>
>;

const ensured = fx.ensure(user.id.length > 0, () => invalidInput);
const required = fx.require(user as User | null | undefined, () => appNotFound);

type _ensure_result = Expect<Equal<TaskResult<typeof ensured>, void>>;
type _ensure_error = Expect<Equal<TaskError<typeof ensured>, InvalidInput>>;
type _require_result = Expect<Equal<TaskResult<typeof required>, User>>;
type _require_error = Expect<Equal<TaskError<typeof required>, AppNotFound>>;

const tupleParallel = fx.sequence([fx.ok(1), fx.ok("two"), fx.ok(true)] as const, {
  concurrency: true,
});

type _parallel_tuple_result = Expect<
  Equal<TaskResult<typeof tupleParallel>, [number, string, boolean]>
>;

const objectParallel = fx.sequence(
  {
    id: fx.ok("1"),
    count: fx.ok(2),
  },
  { concurrency: true },
);

type _parallel_object_result = Expect<
  Equal<TaskResult<typeof objectParallel>, { id: string; count: number }>
>;

const tupleSequence = fx.sequence([fx.ok(1), fx.ok("two")] as const);

type _sequence_tuple_result = Expect<Equal<TaskResult<typeof tupleSequence>, [number, string]>>;

const eachParallel = fx.each([1, 2, 3], (n) => fx.ok(String(n)), {
  concurrency: true,
});

type _each_parallel_result = Expect<Equal<TaskResult<typeof eachParallel>, string[]>>;

const eachLimit = fx.each([1, 2, 3], (n) => fx.ok(n > 1), {
  concurrency: 2,
});

type _each_limit_result = Expect<Equal<TaskResult<typeof eachLimit>, boolean[]>>;

const eachDiscard = fx.eachDiscard([1, 2, 3], (n) => fx.ok(String(n)));

type _each_discard_result = Expect<Equal<TaskResult<typeof eachDiscard>, void>>;

const eachDiscardParallel = fx.eachDiscardParallel([1, 2, 3], (n) => fx.ok(String(n)));

type _each_discard_parallel_result = Expect<Equal<TaskResult<typeof eachDiscardParallel>, void>>;

const eachDiscardLimit = fx.eachDiscardLimit([1, 2, 3], 2, (n) => fx.ok(n > 1));

type _each_discard_limit_result = Expect<Equal<TaskResult<typeof eachDiscardLimit>, void>>;

const andThen = fx.andThen(fx.ok("1"), (id): Task<User> => fx.ok({ ...user, id }));
const onSuccess = fx.onSuccess(fx.ok(user), (loadedUser) =>
  fx.log("loaded", { id: loadedUser.id }),
);
const onFailure = fx.onFailure(fx.fail(new NotFound("1")) as Task<User, NotFound>, (error) =>
  fx.log("failed", { id: error.id }),
);

type _and_then_result = Expect<Equal<TaskResult<typeof andThen>, User>>;
type _on_success_result = Expect<Equal<TaskResult<typeof onSuccess>, User>>;
type _on_failure_error = Expect<Equal<TaskError<typeof onFailure>, NotFound>>;

const retriedTimes = fx.retryTimes(
  fx.fail(new NetworkError("nope")) as Task<User, NetworkError>,
  3,
);
const retriedZeroTimes = fx.retryTimes(
  fx.fail(new NetworkError("nope")) as Task<User, NetworkError>,
  0,
);

type _retry_times_result = Expect<Equal<TaskResult<typeof retriedTimes>, User>>;
type _retry_times_error = Expect<Equal<TaskError<typeof retriedTimes>, NetworkError>>;
type _retry_zero_times_result = Expect<Equal<TaskResult<typeof retriedZeroTimes>, User>>;
type _retry_zero_times_error = Expect<Equal<TaskError<typeof retriedZeroTimes>, NetworkError>>;

const retriedBackoff = fx.retryBackoff(
  fx.fail(new NetworkError("nope")) as Task<User, NetworkError>,
  { base: "100 millis", times: 3 },
);
const retriedWithTimes = fx.retry(fx.fail(new NetworkError("nope")) as Task<User, NetworkError>, {
  times: 3,
});
const retriedWithBackoff = fx.retry(fx.fail(new NetworkError("nope")) as Task<User, NetworkError>, {
  backoff: "100 millis",
  times: 3,
});
const retriedWithEmptyOptions = fx.retry(
  fx.fail(new NetworkError("nope")) as Task<User, NetworkError>,
  {},
);
const _assertRetryFactorRequiresBackoff = (task: Task<User, NetworkError>) => {
  // @ts-expect-error factor requires backoff so it cannot be silently ignored.
  fx.retry(task, { factor: 2 });
};

type _retry_backoff_result = Expect<Equal<TaskResult<typeof retriedBackoff>, User>>;
type _retry_backoff_error = Expect<Equal<TaskError<typeof retriedBackoff>, NetworkError>>;
type _retry_with_times_result = Expect<Equal<TaskResult<typeof retriedWithTimes>, User>>;
type _retry_with_times_error = Expect<Equal<TaskError<typeof retriedWithTimes>, NetworkError>>;
type _retry_with_backoff_result = Expect<Equal<TaskResult<typeof retriedWithBackoff>, User>>;
type _retry_with_backoff_error = Expect<Equal<TaskError<typeof retriedWithBackoff>, NetworkError>>;
type _retry_with_empty_options_result = Expect<
  Equal<TaskResult<typeof retriedWithEmptyOptions>, User>
>;
type _retry_with_empty_options_error = Expect<
  Equal<TaskError<typeof retriedWithEmptyOptions>, NetworkError>
>;
class TimedOut {
  readonly _tag = "TimedOut";
}

const timeoutFailed = fx.timeoutFail(
  fx.ok(user) as Task<User, NetworkError>,
  "1 second",
  () => new TimedOut(),
);
const timeoutFailedOverload = fx.timeout(
  fx.ok(user) as Task<User, NetworkError>,
  "1 second",
  () => new TimedOut(),
);

type _timeout_fail_result = Expect<Equal<TaskResult<typeof timeoutFailed>, User>>;
type _timeout_fail_error = Expect<Equal<TaskError<typeof timeoutFailed>, NetworkError | TimedOut>>;
type _timeout_fail_overload_result = Expect<Equal<TaskResult<typeof timeoutFailedOverload>, User>>;
type _timeout_fail_overload_error = Expect<
  Equal<TaskError<typeof timeoutFailedOverload>, NetworkError | TimedOut>
>;

const spanned = fx.span(fx.ok(user), "load-user", { attributes: { userId: user.id } });
const traced = fx.trace(fx.ok(user), "load-user", { attributes: { userId: user.id } });

type _span_result = Expect<Equal<TaskResult<typeof spanned>, User>>;
type _span_error = Expect<Equal<TaskError<typeof spanned>, never>>;
type _trace_result = Expect<Equal<TaskResult<typeof traced>, User>>;
type _trace_error = Expect<Equal<TaskError<typeof traced>, never>>;

const recovered = fx.recoverTag(
  fx.fail(new NotFound("1")) as Task<User, NotFound | NetworkError>,
  "NotFound",
  () => fx.ok(user),
);

type _recover_tag_result = Expect<Equal<TaskResult<typeof recovered>, User>>;
type _recover_tag_error = Expect<Equal<TaskError<typeof recovered>, NetworkError>>;

const recoveredErrors = fx.recoverErrors(
  fx.fail(validationError) as Task<User, ValidationError | NetworkError>,
  {
    ValidationError: () => fx.ok(user),
  },
);

type _recover_errors_result = Expect<Equal<TaskResult<typeof recoveredErrors>, User>>;
type _recover_errors_error = Expect<Equal<TaskError<typeof recoveredErrors>, NetworkError>>;

const recoveredAppErrors = fx.recoverErrors(
  fx.fail(appNotFound) as Task<User, AppNotFound | InvalidInput | NetworkError>,
  {
    NotFound: () => fx.ok(user),
    InvalidInput: () => fx.ok(user),
  },
);

type _recover_app_errors_result = Expect<Equal<TaskResult<typeof recoveredAppErrors>, User>>;
type _recover_app_errors_error = Expect<Equal<TaskError<typeof recoveredAppErrors>, NetworkError>>;

const either = fx.either(fx.fail(new NotFound("1")) as Task<User, NotFound>);

type _either_result = Expect<Equal<TaskResult<typeof either>, Either.Either<User, NotFound>>>;
type _either_error = Expect<Equal<TaskError<typeof either>, never>>;

const nullable = fx.orNull(fx.fail(new NotFound("1")) as Task<User, NotFound>);

type _or_null_result = Expect<Equal<TaskResult<typeof nullable>, User | null>>;
type _or_null_error = Expect<Equal<TaskError<typeof nullable>, never>>;

const undefinable = fx.orUndefined(fx.fail(new NotFound("1")) as Task<User, NotFound>);

type _or_undefined_result = Expect<Equal<TaskResult<typeof undefinable>, User | undefined>>;
type _or_undefined_error = Expect<Equal<TaskError<typeof undefinable>, never>>;

const repoLayer = fx.layerSync(UserRepo, {
  findById: () => fx.ok(user),
});

type _layer_sync_success = Expect<Equal<Layer.Layer.Success<typeof repoLayer>, UserRepo>>;
type _layer_sync_error = Expect<Equal<Layer.Layer.Error<typeof repoLayer>, never>>;
type _layer_sync_context = Expect<Equal<Layer.Layer.Context<typeof repoLayer>, never>>;

const dependencyProvider = fx.provideDependency(Users, {
  findById: () => fx.ok(user),
});

type _dependency_value_success = Expect<
  Equal<Layer.Layer.Success<typeof dependencyProvider>, UserRepo>
>;
type _dependency_value_error = Expect<Equal<Layer.Layer.Error<typeof dependencyProvider>, never>>;
type _dependency_value_context = Expect<
  Equal<Layer.Layer.Context<typeof dependencyProvider>, never>
>;

const repoLayerEffect = fx.layer(
  UserRepo,
  fx.try({
    try: async () => ({
      findById: () => fx.ok(user),
    }),
    catch: (cause) => new NetworkError(cause),
  }),
);

type _layer_success = Expect<Equal<Layer.Layer.Success<typeof repoLayerEffect>, UserRepo>>;
type _layer_error = Expect<Equal<Layer.Layer.Error<typeof repoLayerEffect>, NetworkError>>;
type _layer_context = Expect<Equal<Layer.Layer.Context<typeof repoLayerEffect>, never>>;

const dependencyTaskProvider = fx.provideDependencyTask(
  Users,
  fx.try({
    try: async () => ({
      findById: () => fx.ok(user),
    }),
    catch: (cause) => new NetworkError(cause),
  }),
);

type _dependency_task_success = Expect<
  Equal<Layer.Layer.Success<typeof dependencyTaskProvider>, UserRepo>
>;
type _dependency_task_error = Expect<
  Equal<Layer.Layer.Error<typeof dependencyTaskProvider>, NetworkError>
>;
type _dependency_task_context = Expect<
  Equal<Layer.Layer.Context<typeof dependencyTaskProvider>, never>
>;

const provided = fx.provide(getUser, repoLayer);

type _provide_result = Expect<Equal<TaskResult<typeof provided>, User>>;
type _provide_error = Expect<Equal<TaskError<typeof provided>, NotFound>>;
type _provide_deps = Expect<Equal<TaskDeps<typeof provided>, never>>;

const used = fx.use(getUser, UserRepo, {
  findById: () => fx.ok(user),
});

type _use_result = Expect<Equal<TaskResult<typeof used>, User>>;
type _use_error = Expect<Equal<TaskError<typeof used>, NotFound>>;
type _use_deps = Expect<Equal<TaskDeps<typeof used>, never>>;

const getUserFromUsers = fx.task(function* () {
  const repo = yield* Users;
  return yield* repo.findById("1");
});

const getUserFromAccessor = fx.task(function* () {
  const repo = yield* fx.getDependency(Users);
  return yield* repo.findById("1");
});

type _get_dependency_result = Expect<Equal<TaskResult<typeof getUserFromAccessor>, User>>;
type _get_dependency_error = Expect<Equal<TaskError<typeof getUserFromAccessor>, NotFound>>;
type _get_dependency_deps = Expect<Equal<TaskDeps<typeof getUserFromAccessor>, UserRepo>>;

interface AuditLog {
  readonly record: (message: string) => Task<void>;
}

const AuditLog = fx.dependency<AuditLog>("AuditLog");

const getUserFromDependencies = fx.task(function* () {
  const { users, audit } = yield* fx.getDependency({
    users: Users,
    audit: AuditLog,
  });

  yield* audit.record("loading");
  return yield* users.findById("1");
});

type _dependencies_result = Expect<Equal<TaskResult<typeof getUserFromDependencies>, User>>;
type _dependencies_error = Expect<Equal<TaskError<typeof getUserFromDependencies>, NotFound>>;
type _dependencies_deps = Expect<
  Equal<TaskDeps<typeof getUserFromDependencies>, UserRepo | AuditLog>
>;

const liveDependencies = fx.dependencies(
  dependencyProvider,
  fx.provideDependency(AuditLog, {
    record: () => fx.ok(undefined),
  }),
);

type _dependencies_live_success = Expect<
  Equal<Layer.Layer.Success<typeof liveDependencies>, UserRepo | AuditLog>
>;
type _dependencies_live_error = Expect<Equal<Layer.Layer.Error<typeof liveDependencies>, never>>;
type _dependencies_live_context = Expect<
  Equal<Layer.Layer.Context<typeof liveDependencies>, never>
>;

const withLiveDependencies = fx.withDependencies(getUserFromDependencies, liveDependencies);
const withLiveDependencyOverload = fx.withDependency(getUserFromDependencies, liveDependencies);
const runWithLiveDependencies = fx.runWith(getUserFromDependencies, liveDependencies);
const runWithOrThrowLiveDependencies = fx.runWithOrThrow(getUserFromDependencies, liveDependencies);
const runWithResultLiveDependencies = fx.runWithResult(getUserFromDependencies, liveDependencies);
const failingDependencies = fx.dependencies(
  fx.layer(Users, fx.fail(new NetworkError("config"))),
  fx.provideDependency(AuditLog, {
    record: () => fx.ok(undefined),
  }),
);
const runWithResultFailingDependencies = fx.runWithResult(
  getUserFromDependencies,
  failingDependencies,
);
const app = fx.app(liveDependencies);
const appProvided = app.provide(getUserFromDependencies);
const appRun = app.run(getUserFromDependencies);

type _with_dependencies_result = Expect<Equal<TaskResult<typeof withLiveDependencies>, User>>;
type _with_dependencies_error = Expect<Equal<TaskError<typeof withLiveDependencies>, NotFound>>;
type _with_dependencies_deps = Expect<Equal<TaskDeps<typeof withLiveDependencies>, never>>;
type _with_dependency_overload_result = Expect<
  Equal<TaskResult<typeof withLiveDependencyOverload>, User>
>;
type _with_dependency_overload_error = Expect<
  Equal<TaskError<typeof withLiveDependencyOverload>, NotFound>
>;
type _with_dependency_overload_deps = Expect<
  Equal<TaskDeps<typeof withLiveDependencyOverload>, never>
>;
type _app_provided_result = Expect<Equal<TaskResult<typeof appProvided>, User>>;
type _app_provided_error = Expect<Equal<TaskError<typeof appProvided>, NotFound>>;
type _app_provided_deps = Expect<Equal<TaskDeps<typeof appProvided>, never>>;
type _run_with_result = Expect<Equal<Awaited<typeof runWithLiveDependencies>, User>>;
type _run_with_or_throw_result = Expect<
  Equal<Awaited<typeof runWithOrThrowLiveDependencies>, User>
>;
type _run_with_result_result = Expect<
  Equal<
    Awaited<typeof runWithResultLiveDependencies>,
    import("../src/index").Result<User, NotFound>
  >
>;
type _run_with_result_layer_error_result = Expect<
  Equal<
    Awaited<typeof runWithResultFailingDependencies>,
    import("../src/index").Result<User, NotFound | NetworkError>
  >
>;
type _app_run_result = Expect<Equal<Awaited<typeof appRun>, User>>;

interface DatabaseConfig {
  readonly prefix: string;
}

const DatabaseConfig = fx.dependency<DatabaseConfig>("DatabaseConfig");
const dependentUsers = fx.layer(
  Users,
  fx.task(function* () {
    const config = yield* fx.getDependency(DatabaseConfig);

    return {
      findById: (id: string) => fx.ok({ id, name: `${config.prefix}-Ada` }),
    };
  }),
);

type _dependent_users_success = Expect<Equal<Layer.Layer.Success<typeof dependentUsers>, UserRepo>>;
type _dependent_users_error = Expect<Equal<Layer.Layer.Error<typeof dependentUsers>, never>>;
type _dependent_users_context = Expect<
  Equal<Layer.Layer.Context<typeof dependentUsers>, DatabaseConfig>
>;

const dependentApp = fx.app(dependentUsers);
const dependentAppProvided = dependentApp.provide(getUserFromUsers);
const configuredDependentUsers = Layer.provide(
  dependentUsers,
  fx.provideDependency(DatabaseConfig, { prefix: "db" }),
);
const runWithConfiguredDependentUsers = fx.runWith(getUserFromUsers, configuredDependentUsers);

type _dependent_app_provided_result = Expect<Equal<TaskResult<typeof dependentAppProvided>, User>>;
type _dependent_app_provided_error = Expect<
  Equal<TaskError<typeof dependentAppProvided>, NotFound>
>;
type _dependent_app_provided_deps = Expect<
  Equal<TaskDeps<typeof dependentAppProvided>, DatabaseConfig>
>;
type _configured_dependent_users_success = Expect<
  Equal<Layer.Layer.Success<typeof configuredDependentUsers>, UserRepo>
>;
type _configured_dependent_users_error = Expect<
  Equal<Layer.Layer.Error<typeof configuredDependentUsers>, never>
>;
type _configured_dependent_users_context = Expect<
  Equal<Layer.Layer.Context<typeof configuredDependentUsers>, never>
>;
type _run_with_configured_dependent_users_result = Expect<
  Equal<Awaited<typeof runWithConfiguredDependentUsers>, User>
>;

const withUsers = fx.withDependency(getUserFromUsers, Users, {
  findById: () => fx.ok(user),
});

type _with_dependency_result = Expect<Equal<TaskResult<typeof withUsers>, User>>;
type _with_dependency_error = Expect<Equal<TaskError<typeof withUsers>, NotFound>>;
type _with_dependency_deps = Expect<Equal<TaskDeps<typeof withUsers>, never>>;

const nativeEffect: Effect.Effect<number> = Effect.succeed(1);
const viaFxEffectImport = fx.map(nativeEffect, (n) => n + 1);

type _effect_subpath_result = Expect<Equal<TaskResult<typeof viaFxEffectImport>, number>>;

const runExit = fx.runExit(fx.ok(user));
const runExitSync = fx.runExitSync(fx.ok(user));
const runOrThrow = fx.runOrThrow(fx.ok(user) as Task<User, NotFound>);
const runOrThrowSync = fx.runOrThrowSync(fx.ok(user));
const runResult = fx.runResult(fx.fail(new NotFound("1")) as Task<User, NotFound>);
const runResultSync = fx.runResultSync(fx.fail(new NotFound("1")) as Task<User, NotFound>);

type _run_exit_result = Expect<
  Equal<Awaited<typeof runExit>, import("../src/effect").Exit.Exit<User, never>>
>;
type _run_exit_sync_result = Expect<
  Equal<typeof runExitSync, import("../src/effect").Exit.Exit<User, never>>
>;
type _run_or_throw_result = Expect<Equal<Awaited<typeof runOrThrow>, User>>;
type _run_or_throw_sync_result = Expect<Equal<typeof runOrThrowSync, User>>;
type _run_result_result = Expect<
  Equal<Awaited<typeof runResult>, import("../src/index").Result<User, NotFound>>
>;
type _run_result_sync_result = Expect<
  Equal<typeof runResultSync, import("../src/index").Result<User, NotFound>>
>;
