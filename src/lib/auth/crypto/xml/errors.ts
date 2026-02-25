import { Data } from 'effect';

export class XMLParserError extends Data.TaggedError('XMLParserError')<{
  message: string;
  cause: unknown;
}> {}

export class KeyImportError extends Data.TaggedError('KeyImportError')<{
  message: string;
  cause: unknown;
}> {}

export class XMLSigningError extends Data.TaggedError('XMLSigningError')<{
  message: string;
  cause: unknown;
}> {}

export class XMLSignatureAppendingError extends Data.TaggedError('XMLSignatureAppendingError')<{
  message: string;
  cause: unknown;
}> {}

export class XMLBuilderError extends Data.TaggedError('XMLBuilderError')<{
  message: string;
  cause: unknown;
}> {}
