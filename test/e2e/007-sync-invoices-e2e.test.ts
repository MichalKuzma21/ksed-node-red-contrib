import { Chunk, Duration, Effect, Layer, Option, Stream, SynchronizedRef } from 'effect/index';
import { expect } from '@effect/vitest';
import { ApiClientLive, ApiConfig } from '../../src/lib/common/api-client';
import { defaultTestConfigProvider } from './utils/default-config-provider';
import { Config } from 'effect';
import * as Clock from 'effect/Clock';
import { loadTestState } from './utils/test-state-manager';
import { startHwmIncrementalInvoiceFetching } from '../../src/lib/invoice-synchro/invoice-metadata-sync/workflow/hwm-sync-workflow';
import { InvoiceQueryFilters } from '../../src/hey-api-generated-ksef-client';

const ApiConfigFromConfig = Layer.effect(
  ApiConfig,
  Config.string('BASE_URL').pipe(Effect.map((baseUrl) => ({ baseUrl }))),
);

export const syncInvoiceTest = Effect.gen(function* () {
  const authState = yield* loadTestState<{ accessToken: string }>('002_refresh_token');
  const sendInvoiceState = yield* loadTestState<{
    ksefNumber: string;
    sendISODate: string;
    invoiceData: {
      issueDate: string;
      invoiceDate: string;
      invoiceNumber: string;
      timestamp: number;
    };
  }>('004_send_invoice');

  const filters: InvoiceQueryFilters = {
    dateRange: {
      dateType: 'PermanentStorage',
      from: sendInvoiceState.sendISODate,
    },
    subjectType: 'Subject1',
  };

  const authTokenRef = Effect.runSync(
    SynchronizedRef.make<Option.Option<string>>(Option.some(authState.accessToken)),
  );

  const stream = startHwmIncrementalInvoiceFetching(
    authTokenRef,
    filters,
    Duration.millis(1000),
    new Date(sendInvoiceState.sendISODate),
  );

  const invoices = yield* stream.pipe(
    Stream.take(10),
    Stream.runCollect,
    Effect.timeout(Duration.seconds(60)),
  );

  const invoicesArray = Chunk.toReadonlyArray(invoices);
  expect(invoicesArray[0].invoice.invoiceNumber).toContain(
    sendInvoiceState.invoiceData.invoiceNumber,
  );
}).pipe(
  Effect.provide(ApiClientLive.pipe(Layer.provide(ApiConfigFromConfig))),
  Effect.withConfigProvider(defaultTestConfigProvider),
  Effect.withClock(Clock.make()),
);
