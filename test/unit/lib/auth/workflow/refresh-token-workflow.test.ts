import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Exit, Layer } from 'effect';
import { refreshAccessTokenWorkflow } from '../../../../../src/lib/auth/workflow/refresh-token';
import { AuthApi } from '../../../../../src/lib/auth/api/auth-service';
import { ApiClient } from '../../../../../src/lib/common/api-client';
import { NetworkError } from '../../../../../src/lib/common/errors';
import type { Client } from '../../../../../src/hey-api-generated-ksef-client/client/types.gen';

const mockRefreshToken = vi.fn();
const mockAuthApiLayer = Layer.succeed(AuthApi, {
  getChallenge: vi.fn(),
  sendSignedXml: vi.fn(),
  getAuthStatus: vi.fn(),
  redeemAccessToken: vi.fn(),
  refreshToken: mockRefreshToken,
} as any);

const apiClientLayer = Layer.succeed(ApiClient, {} as Client);
const testLayers = Layer.merge(mockAuthApiLayer, apiClientLayer);

const mockApiResponse = {
  accessToken: {
    token: 'new-access-token',
    validUntil: '2024-12-31T23:59:59Z',
    challenge: 'c',
    timestamp: 't',
  },
  refreshToken: {
    token: 'new-refresh-token',
    validUntil: '2025-12-31T23:59:59Z',
    challenge: 'c',
    timestamp: 't',
  },
};

const runWorkflow = (tokenValue: string) =>
  Effect.runPromise(refreshAccessTokenWorkflow({ tokenValue }).pipe(Effect.provide(testLayers)));

describe('refreshAccessTokenWorkflow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call refreshToken with the provided token value', async () => {
    mockRefreshToken.mockReturnValue(Effect.succeed(mockApiResponse as any));

    await runWorkflow('my-token-123');

    expect(mockRefreshToken).toHaveBeenCalledWith('my-token-123');
  });

  it('should return newTokenValue from the access token', async () => {
    mockRefreshToken.mockReturnValue(Effect.succeed(mockApiResponse as any));

    const result = await runWorkflow('old-token');

    expect(result.newTokenValue).toBe('new-access-token');
    expect(result.newTokenValidUntil).toBe('2024-12-31T23:59:59Z');
  });

  it('should propagate API errors', async () => {
    mockRefreshToken.mockReturnValue(
      Effect.fail(new NetworkError({ cause: new Error('Network Error') })),
    );

    const exit = await Effect.runPromiseExit(
      refreshAccessTokenWorkflow({ tokenValue: 'old-token' }).pipe(Effect.provide(testLayers)),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(NetworkError);
    }
  });
});
