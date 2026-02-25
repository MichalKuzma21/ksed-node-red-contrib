import { Effect } from 'effect/index';
import { ksefApiErrorMapper } from './api-error-mapper';
import { KsefApiError } from './errors';

export type ApiResponse<TData, TError> =
  | {
      data: TData;
      error: undefined;
    }
  | {
      data: undefined;
      error: TError;
    };

export const unwrapApiResponse =
  <T>(apiName: string) =>
  (
    rsp: ApiResponse<T, unknown> & { request: Request; response: Response },
  ): Effect.Effect<NonNullable<T>, KsefApiError> =>
    rsp.error === undefined
      ? Effect.succeed(rsp.data as NonNullable<T>)
      : Effect.fail(
          ksefApiErrorMapper(apiName, {
            status: rsp.response.status,
            body: rsp.error,
            headers: rsp.response.headers,
          }),
        );
