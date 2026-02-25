import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Exit, Layer } from 'effect';
import { downloadInvoiceWorkflow } from '../../../../../../src/lib/invoice-synchro/invoice-download/workflow/download-invoice-workflow';
import { InvoiceDownloadApi } from '../../../../../../src/lib/invoice-synchro/invoice-download/api/invoice-download-api';
import { InvoiceDeserializationError } from '../../../../../../src/lib/invoice-synchro/invoice-download/errors';
import { ApiClient } from '../../../../../../src/lib/common/api-client';
import { NetworkError } from '../../../../../../src/lib/common/errors';
import type { Client } from '../../../../../../src/hey-api-generated-ksef-client/client/types.gen';

const mockFetchInvoice = vi.fn();
const mockInvoiceDownloadApiLayer = Layer.succeed(InvoiceDownloadApi, {
  fetchInvoice: mockFetchInvoice,
} as any);

const apiClientLayer = Layer.succeed(ApiClient, {} as Client);
const testLayers = Layer.merge(mockInvoiceDownloadApiLayer, apiClientLayer);

const AUTH_TOKEN = 'test-access-token';
const KSEF_NUMBER = 'KSEF/123456/001';

describe('downloadInvoiceWorkflow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return the text content of the downloaded invoice', async () => {
    const invoiceXml = '<Faktura><NrFaktury>FV/2024/001</NrFaktury></Faktura>';
    mockFetchInvoice.mockReturnValue(
      Effect.succeed(new Response(invoiceXml, { headers: { 'Content-Type': 'text/xml' } })),
    );

    const result = await Effect.runPromise(
      downloadInvoiceWorkflow({ authToken: AUTH_TOKEN, ksefNumber: KSEF_NUMBER }).pipe(
        Effect.provide(testLayers),
      ),
    );

    expect(result.xmlContent).toBe(invoiceXml);
  });

  it('should call fetchInvoice with the correct authToken and ksefNumber', async () => {
    mockFetchInvoice.mockReturnValue(Effect.succeed(new Response('<xml/>')));

    await Effect.runPromise(
      downloadInvoiceWorkflow({ authToken: AUTH_TOKEN, ksefNumber: KSEF_NUMBER }).pipe(
        Effect.provide(testLayers),
      ),
    );

    expect(mockFetchInvoice).toHaveBeenCalledWith(AUTH_TOKEN, KSEF_NUMBER);
  });

  it('should propagate fetchInvoice failures', async () => {
    mockFetchInvoice.mockReturnValue(
      Effect.fail(new NetworkError({ cause: new Error('Download failed') })),
    );

    const exit = await Effect.runPromiseExit(
      downloadInvoiceWorkflow({ authToken: AUTH_TOKEN, ksefNumber: KSEF_NUMBER }).pipe(
        Effect.provide(testLayers),
      ),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(NetworkError);
    }
  });

  it('should wrap .text() failure in InvoiceDeserializationError', async () => {
    const brokenResponse = {
      text: () => Promise.reject(new Error('Failed to read body')),
    };
    mockFetchInvoice.mockReturnValue(Effect.succeed(brokenResponse as any));

    const exit = await Effect.runPromiseExit(
      downloadInvoiceWorkflow({ authToken: AUTH_TOKEN, ksefNumber: KSEF_NUMBER }).pipe(
        Effect.provide(testLayers),
      ),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(InvoiceDeserializationError);
    }
  });
});
