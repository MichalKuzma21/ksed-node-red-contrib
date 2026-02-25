import { Effect, Layer } from 'effect/index';
import { ApiClientLive, ApiConfig } from '../../src/lib/common/api-client';
import { NodeFileSystem } from '@effect/platform-node';
import { renderInvoice, invoiceDataDateNow } from './utils/nunjuck-utils';
import { defaultTestConfigProvider } from './utils/default-config-provider';
import { Config } from 'effect';
import { loadResource } from './utils/resources';
import * as Clock from 'effect/Clock';
import { loadTestState, saveTestState } from './utils/test-state-manager';
import { sendInvoiceInInteractiveWorkflow } from '../../src/lib/interactive-session/workflow/send-invoice-workflow';
import { sessionApiLive } from '../../src/lib/interactive-session/api/interactive-session-service';

const ApiConfigFromConfig = Layer.effect(
  ApiConfig,
  Config.string('BASE_URL').pipe(Effect.map((baseUrl) => ({ baseUrl }))),
);

export const sendInvoiceTest = Effect.gen(function* () {
  const authState = yield* loadTestState<{ accessToken: string }>('002_refresh_token');
  const sessionState = yield* loadTestState<{
    referenceNumber: string;
    aesKeyBase64: string;
    ivBase64: string;
  }>('003_init_session');

  const invoiceXmlTemplate = yield* loadResource('invoice-sample-1.xml.njk');
  const invoiceData = invoiceDataDateNow();
  const invoiceXmlRendered = yield* renderInvoice(invoiceXmlTemplate, invoiceData);
  const sendISODate = new Date().toISOString();
  const sendInvoiceResponse = yield* sendInvoiceInInteractiveWorkflow({
    maxRetries: 10,
    intervalMs: 1500,
    accessToken: authState.accessToken,
    referenceNumber: sessionState.referenceNumber,
    aesKeyBase64: sessionState.aesKeyBase64,
    ivBase64: sessionState.ivBase64,
    invoiceXml: invoiceXmlRendered,
  });

  yield* saveTestState('004_send_invoice', {
    sendISODate: sendISODate,
    ksefNumber: sendInvoiceResponse.ksefNumber,
    invoiceData: invoiceData,
  });

  return sendInvoiceResponse;
}).pipe(
  Effect.provide(sessionApiLive),
  Effect.provide(ApiClientLive.pipe(Layer.provide(ApiConfigFromConfig))),
  Effect.provide(NodeFileSystem.layer),
  Effect.withConfigProvider(defaultTestConfigProvider),
  Effect.withClock(Clock.make()),
);
