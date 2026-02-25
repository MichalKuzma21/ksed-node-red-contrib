import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Effect, Exit, Layer, ConfigProvider } from 'effect';
import { authenticateWorkflow } from '../../../../../src/lib/auth/workflow/authenticate';
import { AuthApi } from '../../../../../src/lib/auth/api/auth-service';
import {
  AuthStatusPollingFatalError,
  AuthStatusPollingRetryableError,
} from '../../../../../src/lib/auth/api/errors';
import { ApiClient } from '../../../../../src/lib/common/api-client';
import type { Client } from '../../../../../src/hey-api-generated-ksef-client/client/types.gen';

vi.mock('../../../../../src/lib/auth/crypto/xml-signing', () => ({
  parseXMLString: vi.fn(),
  importPrivateKey: vi.fn(),
  signXMLDocument: vi.fn(),
  appendFixedSignature: vi.fn(),
  serializeXmlDocument: vi.fn(),
}));

import * as XmlSigning from '../../../../../src/lib/auth/crypto/xml-signing';

let mockGetChallenge: Effect.Effect<any, any, any>;
const mockSendSignedXml = vi.fn();
const mockGetAuthStatus = vi.fn();
const mockRedeemAccessToken = vi.fn();

const mockAuthApiLayer = Layer.succeed(AuthApi, {
  get getChallenge() {
    return mockGetChallenge;
  },
  sendSignedXml: mockSendSignedXml,
  getAuthStatus: mockGetAuthStatus,
  redeemAccessToken: mockRedeemAccessToken,
  refreshToken: vi.fn(),
} as any);

const apiClientLayer = Layer.succeed(ApiClient, {} as Client);

const makeConfigLayer = (maxRetries = 2, initialInterval = 1) =>
  Layer.setConfigProvider(
    ConfigProvider.fromJson({
      SUBJECT_IDENTIFIER_TYPE: 'certificateSubject',
      CONTEXT_IDENTIFIER_VALUE: '1234567890',
      CONTEXT_IDENTIFIER_TYPE: 'NIP',
      AUTH_STATUS_POLLING_MAX_RETRIES: maxRetries,
      AUTH_STATUS_POLLING_INITIAL_INTERVAL: initialInterval,
      VERIFY_CERTIFICATE_CHAIN: false,
    }),
  );

const workflowParams = {
  pemKey: new ArrayBuffer(0),
  x509cert: 'mock-cert',
  algo: { name: 'RSA-PSS', hash: 'SHA-256' } as RsaHashedImportParams,
};

const mockSignedXmlResponse = {
  referenceNumber: 'auth-ref-123',
  authenticationToken: { token: 'auth-token', validUntil: '2024-01-01T01:00:00Z' },
};

const mockRedeemResponse = {
  accessToken: { token: 'final-access-token', validUntil: '2024-12-31T23:59:59Z' },
  refreshToken: { token: 'final-refresh-token', validUntil: '2025-12-31T23:59:59Z' },
};

const setupCryptoMocks = () => {
  vi.mocked(XmlSigning.parseXMLString).mockReturnValue(Effect.succeed({} as any));
  vi.mocked(XmlSigning.importPrivateKey).mockReturnValue(Effect.succeed({} as any));
  vi.mocked(XmlSigning.signXMLDocument).mockReturnValue(
    () => () => () => Effect.succeed({} as any),
  );
  vi.mocked(XmlSigning.appendFixedSignature).mockReturnValue(Effect.succeed({} as any));
  vi.mocked(XmlSigning.serializeXmlDocument).mockReturnValue(Effect.succeed('<signed-xml/>'));
};

describe('authenticateWorkflow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    mockGetChallenge = Effect.succeed({
      challenge: 'test-challenge',
      timestamp: '2024-01-01T00:00:00Z',
    });
    setupCryptoMocks();
    mockSendSignedXml.mockReturnValue(Effect.succeed(mockSignedXmlResponse as any));
    mockRedeemAccessToken.mockReturnValue(Effect.succeed(mockRedeemResponse as any));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const runWorkflow = (maxRetries = 2) => {
    const layers = Layer.merge(
      Layer.merge(mockAuthApiLayer, apiClientLayer),
      makeConfigLayer(maxRetries),
    );
    return authenticateWorkflow(workflowParams).pipe(Effect.provide(layers));
  };

  it('should return accessToken and refreshToken from redeemAccessToken response', async () => {
    mockGetAuthStatus.mockReturnValue(
      Effect.succeed({ status: { code: 200, description: 'Success', details: [] } } as any),
    );

    const promise = Effect.runPromise(runWorkflow());
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result.accessToken).toBe('final-access-token');
    expect(result.accessTokenValidUntil).toBe('2024-12-31T23:59:59Z');
    expect(result.refreshToken).toBe('final-refresh-token');
    expect(result.refreshTokenValidUntil).toBe('2025-12-31T23:59:59Z');
  });

  it('should retry on retryable status code (100) and succeed after retryable → success sequence', async () => {
    mockGetAuthStatus
      .mockReturnValueOnce(
        Effect.succeed({ status: { code: 100, description: 'Pending', details: [] } } as any),
      )
      .mockReturnValueOnce(
        Effect.succeed({ status: { code: 200, description: 'Success', details: [] } } as any),
      );

    const promise = Effect.runPromiseExit(runWorkflow());
    await vi.advanceTimersByTimeAsync(1000);
    const exit = await promise;

    expect(Exit.isSuccess(exit)).toBe(true);
    expect(mockGetAuthStatus).toHaveBeenCalledTimes(2);
  });

  it('should fail immediately with AuthStatusPollingFatalError on fatal status code', async () => {
    mockGetAuthStatus.mockReturnValue(
      Effect.succeed({ status: { code: 400, description: 'Bad Request', details: [] } } as any),
    );

    const exit = await Effect.runPromiseExit(runWorkflow());
    await vi.advanceTimersByTimeAsync(100);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(AuthStatusPollingFatalError);
    }
    expect(mockGetAuthStatus).toHaveBeenCalledTimes(1);
  });

  it('should fail with AuthStatusPollingRetryableError after exhausting max retries', async () => {
    mockGetAuthStatus.mockReturnValue(
      Effect.succeed({ status: { code: 100, description: 'Pending', details: [] } } as any),
    );

    const promise = Effect.runPromiseExit(runWorkflow(1));
    await vi.advanceTimersByTimeAsync(1000);
    const exit = await promise;

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(AuthStatusPollingRetryableError);
    }
  });

  it('should call redeemAccessToken with the auth token from sendSignedXml response', async () => {
    mockGetAuthStatus.mockReturnValue(
      Effect.succeed({ status: { code: 200, description: 'Success', details: [] } } as any),
    );

    const promise = Effect.runPromise(runWorkflow());
    await vi.advanceTimersByTimeAsync(100);
    await promise;

    expect(mockRedeemAccessToken).toHaveBeenCalledWith('auth-token');
  });
});
