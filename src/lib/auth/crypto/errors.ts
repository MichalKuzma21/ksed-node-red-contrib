import { Data } from 'effect/index';

export class PrivateKeyReadError extends Data.TaggedError('PrivateKeyReadError')<{
  path: string;
  cause?: unknown;
}> {}

export class InsecureFilePermissions extends Data.TaggedError('InsecureFilePermissions')<{
  path: string;
  mode: number;
}> {}

export class UnsupportedEncryptedKey extends Data.TaggedError('UnsupportedEncryptedKey')<{
  message: string;
}> {}

export class KeyParseError extends Data.TaggedError('KeyParseError')<{ cause?: unknown }> {}

export class CertificateParseError extends Data.TaggedError('CertificateParseError')<{
  cause?: unknown;
}> {}
