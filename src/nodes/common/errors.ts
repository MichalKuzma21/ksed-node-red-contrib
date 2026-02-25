import { Data } from 'effect/index';

export class InvalidMessageError extends Data.TaggedError('InvalidMessageError')<{
  cause: unknown;
  message: string;
}> {}
