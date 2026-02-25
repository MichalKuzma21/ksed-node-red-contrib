import { Data } from 'effect/index';
import { Option } from 'effect/index';

export class NetworkError extends Data.TaggedError('NetworkError')<{
  cause: unknown;
}> {}

export interface ApiExceptionDetail {
  exceptionCode: number;
  exceptionDescription: string;
  details?: string[];
}

export type DetailedApiErrorPayload = {
  exceptionDetailList: ApiExceptionDetail[];
  referenceNumber?: string;
  serviceCode?: string;
  serviceCtx?: string;
  serviceName?: string;
  timestamp?: string;
  cause: unknown;
};

type ApiMeta = {
  apiName: string;
};

export class UnauthorizedError extends Data.TaggedError('UnauthorizedError')<ApiMeta> {}

export class ForbiddenError extends Data.TaggedError('ForbiddenError')<ApiMeta> {}

export class InternalServerError extends Data.TaggedError('InternalServerError')<
  ApiMeta & {
    body?: unknown;
  }
> {}

export class BadRequestError extends Data.TaggedError('BadRequestError')<
  ApiMeta & {
    apiError: DetailedApiErrorPayload;
  }
> {}
export class TooManyRequestError extends Data.TaggedError('TooManyRequestError')<
  ApiMeta & {
    retryAfter: Option.Option<number>;
  }
> {}

export type KsefApiError =
  | NetworkError
  | UnauthorizedError
  | ForbiddenError
  | InternalServerError
  | BadRequestError
  | TooManyRequestError;
