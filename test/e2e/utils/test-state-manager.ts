import { Effect, Context, Layer, Ref, Data } from 'effect';

export interface TestState<T = any> {
  testName: string;
  timestamp: number;
  data: T;
}

export class TestStateNotFoundError extends Data.TaggedError('TestStateNotFoundError')<{
  readonly testName: string;
}> {}

export class TestStateService extends Context.Tag('TestStateService')<
  TestStateService,
  {
    readonly save: <T>(testName: string, data: T) => Effect.Effect<void>;
    readonly load: <T>(testName: string) => Effect.Effect<T, TestStateNotFoundError>;
    readonly clear: (testName?: string) => Effect.Effect<void>;
  }
>() {}

const makeTestStateService = Effect.gen(function* () {
  const stateRef = yield* Ref.make<Map<string, TestState>>(new Map());

  const save = <T>(testName: string, data: T) =>
    Ref.update(stateRef, (map) => {
      const newMap = new Map(map);
      newMap.set(testName, {
        testName,
        timestamp: Date.now(),
        data,
      });
      return newMap;
    }).pipe(Effect.tap(() => Effect.logInfo(`Test state saved: ${testName}`)));

  const load = <T>(testName: string) =>
    Ref.get(stateRef).pipe(
      Effect.flatMap((map) => {
        const state = map.get(testName);
        if (!state) {
          return Effect.fail(new TestStateNotFoundError({ testName }));
        }
        return Effect.succeed(state.data as T);
      }),
      Effect.tapError((error) =>
        Effect.logError(
          `Test state not found for: ${error.testName}. Make sure the dependent test ran successfully.`,
        ),
      ),
    );

  const clear = (testName?: string) =>
    Ref.update(stateRef, (map) => {
      if (testName) {
        const newMap = new Map(map);
        newMap.delete(testName);
        return newMap;
      } else {
        return new Map();
      }
    }).pipe(
      Effect.tap(() =>
        Effect.logInfo(testName ? `Test state cleared: ${testName}` : 'All test state cleared'),
      ),
    );

  return { save, load, clear } as const;
});

export const TestStateServiceLive = Layer.effect(TestStateService, makeTestStateService);

export const saveTestState = <T>(testName: string, data: T) =>
  TestStateService.pipe(Effect.flatMap((service) => service.save(testName, data)));

export const loadTestState = <T>(testName: string) =>
  TestStateService.pipe(Effect.flatMap((service) => service.load<T>(testName)));

export const clearTestState = (testName?: string) =>
  TestStateService.pipe(Effect.flatMap((service) => service.clear(testName)));
