import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { unwrapApiResponse } from '../../../../src/lib/common/unwrap-api-response';
import {
  NetworkError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  TooManyRequestError,
  InternalServerError,
} from '../../../../src/lib/common/errors';

const mockRequest = new Request('https://ksef.example.com/api');

const makeRsp = (overrides: object) => ({
  request: mockRequest,
  ...overrides,
});

const runEither = <T>(effect: Effect.Effect<T, unknown>) => Effect.runSync(Effect.either(effect));

describe('unwrapApiResponse', () => {
  describe('success (error is undefined)', () => {
    it('returns the data when the response is successful', () => {
      const data = { invoices: [], hasMore: false };
      const rsp = makeRsp({ data, error: undefined, response: new Response('', { status: 200 }) });

      const result = runEither(unwrapApiResponse('testApi')(rsp as any));

      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toEqual(data);
      }
    });
  });

  describe('network-level failure (response is undefined)', () => {
    it('returns NetworkError instead of crashing when response is undefined', () => {
      const cause = new TypeError('Failed to fetch');
      const rsp = makeRsp({ data: undefined, error: cause, response: undefined });

      const result = runEither(unwrapApiResponse('postApiV2InvoicesQueryMetadata')(rsp as any));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NetworkError);
        expect((result.left as NetworkError).cause).toBe(cause);
      }
    });

    it('wraps any error value (not just TypeError) in NetworkError', () => {
      const cause = { code: 'ECONNREFUSED' };
      const rsp = makeRsp({ data: undefined, error: cause, response: undefined });

      const result = runEither(unwrapApiResponse('testApi')(rsp as any));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NetworkError);
        expect((result.left as NetworkError).cause).toBe(cause);
      }
    });
  });

  describe('HTTP error mapping (response is defined)', () => {
    it('maps 401 to UnauthorizedError', () => {
      const rsp = makeRsp({
        data: undefined,
        error: 'Unauthorized',
        response: new Response('', { status: 401 }),
      });

      const result = runEither(unwrapApiResponse('testApi')(rsp as any));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(UnauthorizedError);
      }
    });

    it('maps 403 to ForbiddenError', () => {
      const rsp = makeRsp({
        data: undefined,
        error: 'Forbidden',
        response: new Response('', { status: 403 }),
      });

      const result = runEither(unwrapApiResponse('testApi')(rsp as any));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(ForbiddenError);
      }
    });

    it('maps 400 to BadRequestError', () => {
      const body = { exceptionDetailList: [], referenceNumber: 'ref-1' };
      const rsp = makeRsp({
        data: undefined,
        error: body,
        response: new Response('', { status: 400 }),
      });

      const result = runEither(unwrapApiResponse('testApi')(rsp as any));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(BadRequestError);
      }
    });

    it('maps 429 to TooManyRequestError', () => {
      const rsp = makeRsp({
        data: undefined,
        error: 'Too Many Requests',
        response: new Response('', {
          status: 429,
          headers: { 'Retry-After': '30' },
        }),
      });

      const result = runEither(unwrapApiResponse('testApi')(rsp as any));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(TooManyRequestError);
      }
    });

    it('maps 500 to InternalServerError', () => {
      const rsp = makeRsp({
        data: undefined,
        error: 'Internal Server Error',
        response: new Response('', { status: 500 }),
      });

      const result = runEither(unwrapApiResponse('testApi')(rsp as any));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(InternalServerError);
      }
    });
  });
});
