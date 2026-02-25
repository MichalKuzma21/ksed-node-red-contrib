import { Data } from 'effect/index';

export class PDFGenerationError extends Data.TaggedError('PDFGenerationError')<{
  message: string;
  cause: unknown;
}> {}
