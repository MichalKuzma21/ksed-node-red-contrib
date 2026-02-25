import { Effect, Layer } from 'effect/index';
import { ApiClientLive, ApiConfig } from '../../src/lib/common/api-client';
import { authApiLive } from '../../src/lib/auth/api/auth-service';
import { NodeFileSystem } from '@effect/platform-node';
import { defaultTestConfigProvider } from './utils/default-config-provider';
import { Config } from 'effect';
import * as Clock from 'effect/Clock';
import { loadTestState, saveTestState } from './utils/test-state-manager';
import { expect } from 'vitest';
import { refreshAccessTokenWorkflow } from '../../src/lib/auth/workflow/refresh-token';

const ApiConfigFromConfig = Layer.effect(
  ApiConfig,
  Config.string('BASE_URL').pipe(Effect.map((baseUrl) => ({ baseUrl }))),
);

const testLayers = Layer.mergeAll(
  ApiClientLive.pipe(Layer.provide(ApiConfigFromConfig)),
  authApiLive,
  NodeFileSystem.layer,
);

export const refreshTokenTest = Effect.gen(function* () {
  const authState = yield* loadTestState<{ accessToken: string; refreshToken: string }>('001_auth');
  const newToken = yield* refreshAccessTokenWorkflow({ tokenValue: authState.refreshToken });

  expect(newToken.newTokenValue).toBeTypeOf('string');
  expect(newToken.newTokenValue.length).toBeGreaterThan(0);
  expect(newToken.newTokenValidUntil).toBeTypeOf('string');

  yield* saveTestState('002_refresh_token', {
    accessToken: newToken.newTokenValue,
  });

  return newToken;
}).pipe(
  Effect.provide(testLayers),
  Effect.withConfigProvider(defaultTestConfigProvider),
  Effect.withClock(Clock.make()),
);
