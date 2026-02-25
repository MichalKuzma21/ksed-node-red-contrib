import { Effect, Layer } from 'effect/index';
import { expect } from '@effect/vitest';
import { ApiClientLive, ApiConfig } from '../../src/lib/common/api-client';
import { authApiLive } from '../../src/lib/auth/api/auth-service';
import { NodeFileSystem } from '@effect/platform-node';
import { defaultTestConfigProvider } from './utils/default-config-provider';
import { Config } from 'effect';
import * as Clock from 'effect/Clock';
import { saveTestState } from './utils/test-state-manager';
import { loadKeysWorklow } from '../../src/lib/auth/workflow/load-keys';
import { authenticateWorkflow } from '../../src/lib/auth/workflow/authenticate';

const ApiConfigFromConfig = Layer.effect(
  ApiConfig,
  Config.string('BASE_URL').pipe(Effect.map((baseUrl) => ({ baseUrl }))),
);

const testLayers = Layer.mergeAll(
  ApiClientLive.pipe(Layer.provide(ApiConfigFromConfig)),
  authApiLive,
  NodeFileSystem.layer,
);

export const authTest = Effect.gen(function* () {
  const { keyBuffer, certDer } = yield* loadKeysWorklow;

  const authResult = yield* authenticateWorkflow({
    pemKey: keyBuffer,
    x509cert: certDer,
    algo: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
  });

  expect(authResult.accessToken).toBeTypeOf('string');
  expect(authResult.accessToken.length).toBeGreaterThan(0);
  expect(authResult.accessTokenValidUntil).toBeTypeOf('string');
  expect(authResult.refreshToken).toBeTypeOf('string');
  expect(authResult.refreshToken.length).toBeGreaterThan(0);
  expect(authResult.refreshTokenValidUntil).toBeTypeOf('string');

  yield* saveTestState('001_auth', {
    accessToken: authResult.accessToken,
    refreshToken: authResult.refreshToken,
  });

  return authResult;
}).pipe(
  Effect.provide(testLayers),
  Effect.withConfigProvider(defaultTestConfigProvider),
  Effect.withClock(Clock.make()),
);
