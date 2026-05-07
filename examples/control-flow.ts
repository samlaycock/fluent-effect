import { fx } from "../src/index";

const AppError = fx.errors<{
  ValidationError: { field: string };
  SaveError: { cause: unknown };
}>();

interface FormInput {
  readonly email: string;
  readonly sendReceipt: boolean;
}

const validate = (input: FormInput) =>
  fx.task(function* () {
    yield* fx.ensure(input.email.includes("@"), () => AppError.ValidationError({ field: "email" }));

    return input;
  });

const save = (input: FormInput) =>
  fx.try({
    try: () => ({ id: "user-1", email: input.email }),
    catch: (cause) => AppError.SaveError({ cause }),
  });

const sendReceipt = (email: string) => fx.log("Sending receipt", { email });

const submit = (input: FormInput) =>
  fx.recover(
    fx.task(function* () {
      const saved = yield* fx.map(validate(input), (validInput) => ({
        ...validInput,
        email: validInput.email.toLowerCase(),
      }));

      const user = yield* save(saved);

      yield* fx.when(saved.sendReceipt, {
        onTrue: () => sendReceipt(user.email),
        onFalse: () => fx.log("Skipping receipt", { email: user.email }),
      });

      return user;
    }),
    (error) =>
      fx.task(function* () {
        yield* fx.logError("Submit failed", error);
        return null;
      }),
  );

export const main = fx.run(
  submit({
    email: "ADA@example.com",
    sendReceipt: true,
  }),
);
