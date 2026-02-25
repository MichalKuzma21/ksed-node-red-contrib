import { Data } from 'effect';
import { NetworkError } from '../../common/errors';

export class AuthStatusPollingFatalError extends Data.TaggedError('AuthStatusPollingFatalError')<{
  code: number;
  description: string;
  details: Array<string>;
}> {}

export class AuthStatusPollingRetryableError extends Data.TaggedError(
  'AuthStatusPollingRetryableError',
)<{
  code: number;
  description: string;
  details: Array<string>;
}> {}

export type AuthStatusApiError =
  | NetworkError
  | AuthStatusPollingFatalError
  | AuthStatusPollingRetryableError;
