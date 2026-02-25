import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Exit, Layer } from 'effect';
import { closeSessionWorkflow } from '../../../../../src/lib/interactive-session/workflow/close-session-workflow';
import { InteractiveSessionApi } from '../../../../../src/lib/interactive-session/api/interactive-session-service';
import { ApiClient } from '../../../../../src/lib/common/api-client';
import { NetworkError } from '../../../../../src/lib/common/errors';
import type { Client } from '../../../../../src/hey-api-generated-ksef-client/client/types.gen';

const mockCloseSession = vi.fn();
const mockInteractiveSessionLayer = Layer.succeed(InteractiveSessionApi, {
  openSession: vi.fn(),
  closeSession: mockCloseSession,
  sendInvoice: vi.fn(),
  checkStatus: vi.fn(),
} as any);

const apiClientLayer = Layer.succeed(ApiClient, {} as Client);
const testLayers = Layer.merge(mockInteractiveSessionLayer, apiClientLayer);

const params = {
  accessToken: 'test-access-token',
  referenceNumber: 'session-ref-456',
};

describe('closeSessionWorkflow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return the referenceNumber from workflow params (not from API)', async () => {
    mockCloseSession.mockReturnValue(Effect.succeed(undefined));

    const result = await Effect.runPromise(
      closeSessionWorkflow(params).pipe(Effect.provide(testLayers)),
    );

    expect(result.referenceNumber).toBe('session-ref-456');
  });

  it('should call closeSession with accessToken and referenceNumber from params', async () => {
    mockCloseSession.mockReturnValue(Effect.succeed(undefined));

    await Effect.runPromise(closeSessionWorkflow(params).pipe(Effect.provide(testLayers)));

    expect(mockCloseSession).toHaveBeenCalledWith('test-access-token', 'session-ref-456');
  });

  it('should propagate closeSession failures', async () => {
    mockCloseSession.mockReturnValue(
      Effect.fail(new NetworkError({ cause: new Error('Session close failed') })),
    );

    const exit = await Effect.runPromiseExit(
      closeSessionWorkflow(params).pipe(Effect.provide(testLayers)),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(NetworkError);
    }
  });
});
