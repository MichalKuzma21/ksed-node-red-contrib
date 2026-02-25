import { Data } from 'effect';
import { NetworkError } from '../../common/errors';

export class FetchMetadataError extends Data.TaggedError('FetchMetadataError')<{
  message: string;
  cause: unknown;
}> {}

export class FetchMetadataMissingAuthTokenError extends Data.TaggedError(
  'FetchMetadataMissingAuthTokenError',
)<{
  message: string;
}> {}

export class FetchMetadataTooManyRequest extends Data.TaggedError('FetchMetadataTooManyRequest')<{
  retryAfter: number;
  code: number;
  description: string;
  details: string;
}> {}

export type FetchMetadataFailure =
  | FetchMetadataMissingAuthTokenError
  | FetchMetadataError
  | FetchMetadataTooManyRequest
  | NetworkError;
