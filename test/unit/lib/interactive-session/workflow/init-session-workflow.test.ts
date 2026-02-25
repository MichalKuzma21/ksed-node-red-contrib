import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Exit, Layer } from 'effect';
import { initSessionWorkflow } from '../../../../../src/lib/interactive-session/workflow/init-session-workflow';
import { InteractiveSessionApi } from '../../../../../src/lib/interactive-session/api/interactive-session-service';
import { NoKsefPublicKeyFoundError } from '../../../../../src/lib/interactive-session/api/errors';
import { ApiClient } from '../../../../../src/lib/common/api-client';
import type { Client } from '../../../../../src/hey-api-generated-ksef-client/client/types.gen';

// fetchKsefPublicKeyCertificate is an Effect value - use getter pattern
let _certificatesEffect: Effect.Effect<any, any, any>;
vi.mock('../../../../../src/lib/interactive-session/api/fetch-ksef-public-key', () => ({
  get fetchKsefPublicKeyCertificate() {
    return _certificatesEffect;
  },
}));

// Mock all crypto key operations - we test orchestration, not WebCrypto
vi.mock('../../../../../src/lib/interactive-session/keys/keys-utils', () => ({
  generateAesKeyAndIv: vi.fn(),
  importKsefPublicKey: vi.fn(),
  encryptAesKeyWithRsa: vi.fn(),
  exportAesKeyToRawBytes: vi.fn(),
  importAesKeyFromRawBytes: vi.fn(),
  encryptDocument: vi.fn(),
  hashSHA256: vi.fn(),
}));

import * as KeysUtils from '../../../../../src/lib/interactive-session/keys/keys-utils';

const mockOpenSession = vi.fn();
const mockInteractiveSessionLayer = Layer.succeed(InteractiveSessionApi, {
  openSession: mockOpenSession,
  closeSession: vi.fn(),
  sendInvoice: vi.fn(),
  checkStatus: vi.fn(),
} as any);

const apiClientLayer = Layer.succeed(ApiClient, {} as Client);
const testLayers = Layer.merge(mockInteractiveSessionLayer, apiClientLayer);

const workflowParams = {
  accessToken: 'test-access-token',
  formCodeSystemCode: 'FA (3)',
  formCodeSchemaVersion: '1-0E',
  formCodeValue: 'FA',
};

const MOCK_AES_KEY = {} as CryptoKey;
const MOCK_RSA_KEY = {} as CryptoKey;
const MOCK_IV = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
const MOCK_KEY_BYTES = new Uint8Array([0xaa, 0xbb, 0xcc]);
const MOCK_ENCRYPTED_KEY = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);

const setupKeysMocks = () => {
  vi.mocked(KeysUtils.generateAesKeyAndIv).mockReturnValue(
    Effect.succeed({ key: MOCK_AES_KEY, iv: MOCK_IV }),
  );
  vi.mocked(KeysUtils.importKsefPublicKey).mockReturnValue(Effect.succeed(MOCK_RSA_KEY));
  vi.mocked(KeysUtils.encryptAesKeyWithRsa).mockReturnValue(
    Effect.succeed(MOCK_ENCRYPTED_KEY.buffer),
  );
  vi.mocked(KeysUtils.exportAesKeyToRawBytes).mockReturnValue(Effect.succeed(MOCK_KEY_BYTES));
};

describe('initSessionWorkflow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupKeysMocks();
    mockOpenSession.mockReturnValue(
      Effect.succeed({ referenceNumber: 'session-ref-789', validUntil: '2024-12-31T23:59:59Z' }),
    );
  });

  it('should return referenceNumber from the open session response', async () => {
    _certificatesEffect = Effect.succeed([
      { certificate: 'cert1', usage: ['SymmetricKeyEncryption'] },
    ]);

    const result = await Effect.runPromise(
      initSessionWorkflow(workflowParams).pipe(Effect.provide(testLayers)),
    );

    expect(result.referenceNumber).toBe('session-ref-789');
  });

  it('should return base64-encoded AES key and IV', async () => {
    _certificatesEffect = Effect.succeed([
      { certificate: 'cert1', usage: ['SymmetricKeyEncryption'] },
    ]);

    const result = await Effect.runPromise(
      initSessionWorkflow(workflowParams).pipe(Effect.provide(testLayers)),
    );

    expect(result.aesKeyBase64).toBe(Buffer.from(MOCK_KEY_BYTES).toString('base64'));
    expect(result.ivBase64).toBe(Buffer.from(MOCK_IV).toString('base64'));
  });

  it('should select the certificate with SymmetricKeyEncryption usage', async () => {
    _certificatesEffect = Effect.succeed([
      { certificate: 'cert-signing', usage: ['Signature'] },
      { certificate: 'cert-encryption', usage: ['SymmetricKeyEncryption', 'Other'] },
      { certificate: 'cert-other', usage: ['Other'] },
    ]);

    await Effect.runPromise(initSessionWorkflow(workflowParams).pipe(Effect.provide(testLayers)));

    expect(KeysUtils.importKsefPublicKey).toHaveBeenCalledWith('cert-encryption');
  });

  it('should fail with NoKsefPublicKeyFoundError when no certificate has SymmetricKeyEncryption usage', async () => {
    _certificatesEffect = Effect.succeed([
      { certificate: 'cert1', usage: ['Signature'] },
      { certificate: 'cert2', usage: ['Other'] },
    ]);

    const exit = await Effect.runPromiseExit(
      initSessionWorkflow(workflowParams).pipe(Effect.provide(testLayers)),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(NoKsefPublicKeyFoundError);
    }
  });

  it('should fail with NoKsefPublicKeyFoundError when certificate list is empty', async () => {
    _certificatesEffect = Effect.succeed([]);

    const exit = await Effect.runPromiseExit(
      initSessionWorkflow(workflowParams).pipe(Effect.provide(testLayers)),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(NoKsefPublicKeyFoundError);
    }
  });

  it('should call openSession with correct formCode and encryption info', async () => {
    _certificatesEffect = Effect.succeed([
      { certificate: 'cert1', usage: ['SymmetricKeyEncryption'] },
    ]);

    await Effect.runPromise(initSessionWorkflow(workflowParams).pipe(Effect.provide(testLayers)));

    expect(mockOpenSession).toHaveBeenCalledWith(
      'test-access-token',
      { systemCode: 'FA (3)', schemaVersion: '1-0E', value: 'FA' },
      expect.objectContaining({
        encryptedSymmetricKey: expect.any(String),
        initializationVector: expect.any(String),
      }),
    );
  });
});
