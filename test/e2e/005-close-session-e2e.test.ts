import { Effect, Layer } from 'effect/index';
import { ApiClientLive, ApiConfig } from '../../src/lib/common/api-client';
import { NodeFileSystem } from '@effect/platform-node';
import { defaultTestConfigProvider } from './utils/default-config-provider';
import { Config } from 'effect';
import * as Clock from 'effect/Clock';
import { loadTestState, saveTestState } from './utils/test-state-manager';
import { closeSessionWorkflow } from '../../src/lib/interactive-session/workflow/close-session-workflow';
import { sessionApiLive } from '../../src/lib/interactive-session/api/interactive-session-service';

const ApiConfigFromConfig = Layer.effect(
  ApiConfig,
  Config.string('BASE_URL').pipe(Effect.map((baseUrl) => ({ baseUrl }))),
);

export const closeSessionTest = Effect.gen(function* () {
  const authState = yield* loadTestState<{ accessToken: string }>('002_refresh_token');
  const sessionState = yield* loadTestState<{ referenceNumber: string }>('003_init_session');

  const closeSessionResponse = yield* closeSessionWorkflow({
    accessToken: authState.accessToken,
    referenceNumber: sessionState.referenceNumber,
  });

  yield* saveTestState('005_close_session', closeSessionResponse);

  return closeSessionResponse;
}).pipe(
  Effect.provide(sessionApiLive),
  Effect.provide(ApiClientLive.pipe(Layer.provide(ApiConfigFromConfig))),
  Effect.provide(NodeFileSystem.layer),
  Effect.withConfigProvider(defaultTestConfigProvider),
  Effect.withClock(Clock.make()),
);
