import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Exit, Layer } from 'effect';
import { sendInvoiceInInteractiveWorkflow } from '../../../../../src/lib/interactive-session/workflow/send-invoice-workflow';
import { InteractiveSessionApi } from '../../../../../src/lib/interactive-session/api/interactive-session-service';
import { InvoiceStatusFatalError } from '../../../../../src/lib/interactive-session/api/errors';
import { ApiClient } from '../../../../../src/lib/common/api-client';
import { NetworkError } from '../../../../../src/lib/common/errors';
import type { Client } from '../../../../../src/hey-api-generated-ksef-client/client/types.gen';

// Mock crypto operations - we test workflow orchestration, not WebCrypto
vi.mock('../../../../../src/lib/interactive-session/keys/keys-utils', () => ({
  importAesKeyFromRawBytes: vi.fn(),
  encryptDocument: vi.fn(),
  hashSHA256: vi.fn(),
  generateAesKeyAndIv: vi.fn(),
  importKsefPublicKey: vi.fn(),
  encryptAesKeyWithRsa: vi.fn(),
  exportAesKeyToRawBytes: vi.fn(),
}));

import * as KeysUtils from '../../../../../src/lib/interactive-session/keys/keys-utils';

const mockSendInvoice = vi.fn();
const mockCheckStatus = vi.fn();
const mockInteractiveSessionLayer = Layer.succeed(InteractiveSessionApi, {
  openSession: vi.fn(),
  closeSession: vi.fn(),
  sendInvoice: mockSendInvoice,
  checkStatus: mockCheckStatus,
} as any);

const apiClientLayer = Layer.succeed(ApiClient, {} as Client);
const testLayers = Layer.merge(mockInteractiveSessionLayer, apiClientLayer);

const MOCK_AES_KEY = {} as CryptoKey;
const MOCK_ENCRYPTED_BYTES = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
const MOCK_HASH_BYTES = new Uint8Array([0x01, 0x02, 0x03]);
const MOCK_ENCRYPTED_HASH = new Uint8Array([0x04, 0x05, 0x06]);

const workflowParams = {
  maxRetries: 3,
  intervalMs: 10,
  accessToken: 'test-access-token',
  aesKeyBase64: Buffer.from([0xaa, 0xbb, 0xcc]).toString('base64'),
  ivBase64: Buffer.from([
    0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00,
  ]).toString('base64'),
  referenceNumber: 'session-ref-123',
  invoiceXml: '<Faktura>...</Faktura>',
};

const mockStatusResponse = {
  ordinalNumber: 1,
  invoiceNumber: 'FV/2024/001',
  ksefNumber: 'KSEF/123456/001',
  referenceNumber: 'inv-ref-789',
  invoiceHash: 'hash-abc',
  invoiceFileName: 'faktura.xml',
  acquisitionDate: '2024-01-01',
  invoicingDate: '2024-01-01',
  permanentStorageDate: '2024-01-02',
  upoDownloadUrl: 'https://ksef.mf.gov.pl/upo/123',
  upoDownloadUrlExpirationDate: '2024-12-31',
  invoicingMode: 'ONLINE',
  status: { code: 200, description: 'Success', details: [], extensions: null },
};

describe('sendInvoiceInInteractiveWorkflow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(KeysUtils.importAesKeyFromRawBytes).mockReturnValue(Effect.succeed(MOCK_AES_KEY));
    vi.mocked(KeysUtils.encryptDocument).mockReturnValue(Effect.succeed(MOCK_ENCRYPTED_BYTES));
    vi.mocked(KeysUtils.hashSHA256).mockReturnValue(() => Effect.succeed(MOCK_HASH_BYTES.buffer));
    vi.mocked(KeysUtils.hashSHA256)
      .mockReturnValueOnce(() => Effect.succeed(MOCK_ENCRYPTED_HASH.buffer))
      .mockReturnValue(() => Effect.succeed(MOCK_HASH_BYTES.buffer));
    mockSendInvoice.mockReturnValue(Effect.succeed({ referenceNumber: 'inv-ref-789' }));
    mockCheckStatus.mockReturnValue(Effect.succeed(mockStatusResponse));
  });

  it('should map all status response fields to workflow response', async () => {
    const result = await Effect.runPromise(
      sendInvoiceInInteractiveWorkflow(workflowParams).pipe(Effect.provide(testLayers)),
    );

    expect(result.ordinalNumber).toBe(1);
    expect(result.invoiceNumber).toBe('FV/2024/001');
    expect(result.ksefNumber).toBe('KSEF/123456/001');
    expect(result.referenceNumber).toBe('inv-ref-789');
    expect(result.invoiceHash).toBe('hash-abc');
    expect(result.invoiceFileName).toBe('faktura.xml');
    expect(result.acquisitionDate).toBe('2024-01-01');
    expect(result.invoicingDate).toBe('2024-01-01');
    expect(result.permanentStorageDate).toBe('2024-01-02');
    expect(result.upoDownloadUrl).toBe('https://ksef.mf.gov.pl/upo/123');
    expect(result.invoicingMode).toBe('ONLINE');
    expect(result.code).toBe(200);
    expect(result.description).toBe('Success');
  });

  it('should always send invoice with offlineMode: false', async () => {
    await Effect.runPromise(
      sendInvoiceInInteractiveWorkflow(workflowParams).pipe(Effect.provide(testLayers)),
    );

    expect(mockSendInvoice).toHaveBeenCalledWith(
      workflowParams.accessToken,
      workflowParams.referenceNumber,
      expect.objectContaining({ offlineMode: false }),
    );
  });

  it('should call checkStatus with session and invoice reference numbers', async () => {
    await Effect.runPromise(
      sendInvoiceInInteractiveWorkflow(workflowParams).pipe(Effect.provide(testLayers)),
    );

    expect(mockCheckStatus).toHaveBeenCalledWith(
      workflowParams.accessToken,
      workflowParams.referenceNumber,
      'inv-ref-789',
      workflowParams.maxRetries,
      workflowParams.intervalMs,
    );
  });

  it('should propagate sendInvoice failure', async () => {
    mockSendInvoice.mockReturnValue(
      Effect.fail(new NetworkError({ cause: new Error('Send failed') })),
    );

    const exit = await Effect.runPromiseExit(
      sendInvoiceInInteractiveWorkflow(workflowParams).pipe(Effect.provide(testLayers)),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(NetworkError);
    }
  });

  it('should propagate checkStatus failure', async () => {
    mockCheckStatus.mockReturnValue(
      Effect.fail(
        new InvoiceStatusFatalError({ code: 400, description: 'Bad invoice', details: [] }),
      ),
    );

    const exit = await Effect.runPromiseExit(
      sendInvoiceInInteractiveWorkflow(workflowParams).pipe(Effect.provide(testLayers)),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(InvoiceStatusFatalError);
    }
  });
});
