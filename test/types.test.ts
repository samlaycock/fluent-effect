import {
  fx,
  type ErrorOf,
  type ErrorsOf,
  type Task,
  type TaskDeps,
  type TaskError,
  type TaskResult,
} from "../src/index";
import { Effect, Either, Layer } from "../src/effect";

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

const succeeded = fx.succeed(user);
const fromSync = fx.fromSync(() => user);

type _succeed_result = Expect<Equal<TaskResult<typeof succeeded>, User>>;
type _from_sync_result = Expect<Equal<TaskResult<typeof fromSync>, User>>;

const validationError = ValidationError({ field: "email" });
const appNotFound = AppError.NotFound({ id: "1" });
const invalidInput = AppError.InvalidInput({ field: "email" });

type _error_factory_value = Expect<
  Equal<
    typeof validationError,
    import("../src/index").FxError<"ValidationError", { field: string }>
  >
>;

type _errors_not_found_value = Expect<
  Equal<typeof appNotFound, import("../src/index").FxError<"NotFound", { id: string }>>
>;

type _errors_invalid_input_value = Expect<
  Equal<typeof invalidInput, import("../src/index").FxError<"InvalidInput", { field: string }>>
>;

type _error_instances_union = Expect<Equal<AppErrors, AppNotFound | InvalidInput>>;

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

type _retry_times_result = Expect<Equal<TaskResult<typeof retriedTimes>, User>>;
type _retry_times_error = Expect<Equal<TaskError<typeof retriedTimes>, NetworkError>>;

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

type _retry_backoff_result = Expect<Equal<TaskResult<typeof retriedBackoff>, User>>;
type _retry_backoff_error = Expect<Equal<TaskError<typeof retriedBackoff>, NetworkError>>;
type _retry_with_times_result = Expect<Equal<TaskResult<typeof retriedWithTimes>, User>>;
type _retry_with_times_error = Expect<Equal<TaskError<typeof retriedWithTimes>, NetworkError>>;
type _retry_with_backoff_result = Expect<Equal<TaskResult<typeof retriedWithBackoff>, User>>;
type _retry_with_backoff_error = Expect<Equal<TaskError<typeof retriedWithBackoff>, NetworkError>>;

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

const dependencyTaskProvider = fx.provideDependency(
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
type _app_run_result = Expect<Equal<Awaited<typeof appRun>, User>>;

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

type _run_exit_result = Expect<
  Equal<Awaited<typeof runExit>, import("../src/effect").Exit.Exit<User, never>>
>;
type _run_exit_sync_result = Expect<
  Equal<typeof runExitSync, import("../src/effect").Exit.Exit<User, never>>
>;
