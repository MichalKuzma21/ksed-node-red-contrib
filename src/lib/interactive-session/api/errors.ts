import { Data } from 'effect';
import { NetworkError } from '../../common/errors';

export class SendInvoiceError extends Data.TaggedError('SendInvoiceError')<{
  message: string;
  cause: unknown;
}> {}

export class FetchKsefPublicKeyError extends Data.TaggedError('FetchKsefPublicKeyError')<{
  message: string;
  cause: unknown;
}> {}

export class NoKsefPublicKeyFoundError extends Data.TaggedError('NoKsefPublicKeyFoundError')<{
  message: string;
}> {}

export class HashingError extends Data.TaggedError('HashingError')<{
  message: string;
  cause: unknown;
}> {}

export class InvoiceStatusFatalError extends Data.TaggedError('InvoiceStatusFatalError')<{
  code: number;
  description: string;
  details: Array<string>;
}> {}

export class InvoiceStatusRetryableError extends Data.TaggedError('InvoiceStatusRetryableError')<{
  code: number;
  description: string;
  details: Array<string>;
}> {}

export type InvoiceStatusError =
  | NetworkError
  | InvoiceStatusFatalError
  | InvoiceStatusRetryableError;

export class CloseSessionError extends Data.TaggedError('CloseSessionError')<{
  cause: unknown;
  message: string;
}> {}
