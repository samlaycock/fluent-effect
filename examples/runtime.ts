import { fx, type Task } from "../src/index";

interface Config {
  readonly appName: string;
}

const Config = fx.dependency<Config>("Config");

const program: Task<string, never, Config> = fx.task(function* () {
  const config = yield* fx.getDependency(Config);
  return `Starting ${config.appName}`;
});

const dependencies = fx.dependencies(
  fx.provideDependency(Config, {
    appName: "fx-demo",
  }),
);

const app = fx.app(dependencies);

export const providedProgram = app.provide(program);
export const runWithResult = fx.runWith(program, dependencies);
export const appRunResult = app.run(program);
export const appExitResult = app.runExit(program);
