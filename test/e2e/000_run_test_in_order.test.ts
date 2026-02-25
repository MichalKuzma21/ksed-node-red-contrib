import { describe, it } from '@effect/vitest';
import { Duration, Effect, Layer, Scope } from 'effect';
import { TestStateServiceLive } from './utils/test-state-manager';
import * as Clock from 'effect/Clock';

import { authTest } from './001-ksef-certificate-auth-e2e.test';
import { refreshTokenTest } from './002-refresh-token-e2e.test';
import { initSessionTest } from './003-init-session-e2e.test';
import { sendInvoiceTest } from './004-send-invoice-e2e.test';
import { closeSessionTest } from './005-close-session-e2e.test';
import { downloadInvoiceTest } from './006-download-invoice-e2e.test';
import { syncInvoiceTest } from './007-sync-invoices-e2e.test';

const sharedLayers = await Effect.runPromise(
  Effect.gen(function* () {
    const scope = yield* Scope.make();
    return yield* Layer.build(Layer.mergeAll(TestStateServiceLive)).pipe(Scope.extend(scope));
  }),
);

describe.sequential('E2E Tests - Sequential Execution', () => {
  it.effect('001 - Ksef Certificate Auth', () => authTest.pipe(Effect.provide(sharedLayers)));
  it.effect('002 - Refresh token', () => refreshTokenTest.pipe(Effect.provide(sharedLayers)));
  it.effect('003 - Init session', () => initSessionTest.pipe(Effect.provide(sharedLayers)));
  it.effect('004 - Send Invoice', () => sendInvoiceTest.pipe(Effect.provide(sharedLayers)));
  it.effect('005 - Close session', () => closeSessionTest.pipe(Effect.provide(sharedLayers)));
  // We have to sleep, because KSEF API need some time to process invoice after returning 200 :)
  it.effect('0055 - Sleep', () =>
    Effect.sleep(Duration.millis(4500)).pipe(Effect.withClock(Clock.make())),
  );
  it.effect('0056 - Sleep', () =>
    Effect.sleep(Duration.millis(4500)).pipe(Effect.withClock(Clock.make())),
  );
  it.effect('006 - Download invoice', () => downloadInvoiceTest.pipe(Effect.provide(sharedLayers)));
  it.effect('007 - Sync invoices', () => syncInvoiceTest.pipe(Effect.provide(sharedLayers)));
});
