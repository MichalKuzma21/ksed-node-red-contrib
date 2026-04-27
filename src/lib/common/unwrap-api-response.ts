import { Effect } from 'effect/index';
import { ksefApiErrorMapper } from './api-error-mapper';
import { KsefApiError, NetworkError } from './errors';

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
    rsp: ApiResponse<T, unknown> & { request: Request; response: Response | undefined },
  ): Effect.Effect<NonNullable<T>, KsefApiError> => {
    if (rsp.error === undefined) {
      return Effect.succeed(rsp.data as NonNullable<T>);
    }
    if (!rsp.response) {
      return Effect.fail(new NetworkError({ cause: rsp.error }));
    }
    return Effect.fail(
      ksefApiErrorMapper(apiName, {
        status: rsp.response.status,
        body: rsp.error,
        headers: rsp.response.headers,
      }),
    );
  };
