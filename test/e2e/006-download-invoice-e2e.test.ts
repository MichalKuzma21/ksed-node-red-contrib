import { Effect, Layer } from 'effect/index';
import { expect } from '@effect/vitest';
import { ApiClientLive, ApiConfig } from '../../src/lib/common/api-client';
import { defaultTestConfigProvider } from './utils/default-config-provider';
import { Config } from 'effect';
import * as Clock from 'effect/Clock';
import { loadTestState } from './utils/test-state-manager';
import * as convert from 'xml-js';
import { downloadInvoiceWorkflow } from '../../src/lib/invoice-synchro/invoice-download/workflow/download-invoice-workflow';
import { invoiceDownloadApiLive } from '../../src/lib/invoice-synchro/invoice-download/api/invoice-download-api';

const ApiConfigFromConfig = Layer.effect(
  ApiConfig,
  Config.string('BASE_URL').pipe(Effect.map((baseUrl) => ({ baseUrl }))),
);

export const downloadInvoiceTest = Effect.gen(function* () {
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

  const invoice = yield* downloadInvoiceWorkflow({
    authToken: authState.accessToken,
    ksefNumber: sendInvoiceState.ksefNumber,
  });

  const xml = convert.xml2js(invoice.xmlContent, { compact: true });
  expect((xml as any)['Faktura']['Fa']['P_2']['_text']).toEqual(
    sendInvoiceState.invoiceData.invoiceNumber,
  );
}).pipe(
  Effect.provide(invoiceDownloadApiLive),
  Effect.provide(ApiClientLive.pipe(Layer.provide(ApiConfigFromConfig))),
  Effect.withConfigProvider(defaultTestConfigProvider),
  Effect.withClock(Clock.make()),
);
