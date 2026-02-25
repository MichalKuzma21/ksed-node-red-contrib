import { Data } from 'effect';

export class KeyLoadingError extends Data.TaggedError('KeyLoadingError')<{
  message: string;
  cause: unknown;
}> {}

export class EncryptionError extends Data.TaggedError('EncryptionError')<{
  message: string;
  cause: unknown;
}> {}
