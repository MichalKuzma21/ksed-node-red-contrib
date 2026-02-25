import { Data } from 'effect';
import { NetworkError } from '../../common/errors';

export class FetchInvoiceError extends Data.TaggedError('FetchInvoiceError')<{
  message: string;
  cause: unknown;
}> {}

export type InvoiceDownloadFailure = FetchInvoiceError | NetworkError;

export class InvoiceDeserializationError extends Data.TaggedError('InvoiceDeserializationError')<{
  message: string;
  cause: unknown;
}> {}
