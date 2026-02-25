import { Schema, Config } from 'effect';

export const AuthenticationNodeConfig = Config.all({
  BASE_URL: Schema.Config(
    'BASE_URL',
    Schema.Union(
      Schema.String.pipe(Schema.startsWith('http://')),
      Schema.String.pipe(Schema.startsWith('https://')),
    ),
  ),

  DEBUG: Schema.Config('DEBUG', Schema.BooleanFromString),
  VERIFY_CERTIFICATE_CHAIN: Schema.Config('VERIFY_CERTIFICATE_CHAIN', Schema.BooleanFromString),
  SUBJECT_IDENTIFIER_TYPE: Schema.Config(
    'SUBJECT_IDENTIFIER_TYPE',
    Schema.Union(Schema.Literal('certificateSubject'), Schema.Literal('certificateFingerprint')),
  ),
  CONTEXT_IDENTIFIER_TYPE: Schema.Config(
    'CONTEXT_IDENTIFIER_TYPE',
    Schema.Union(Schema.Literal('Nip'), Schema.Literal('InternalId'), Schema.Literal('NipVatUe')),
  ),
  CONTEXT_IDENTIFIER_VALUE: Schema.Config('CONTEXT_IDENTIFIER_VALUE', Schema.NonEmptyTrimmedString),
  AUTH_STATUS_POLLING_MAX_RETRIES: Schema.Config(
    'AUTH_STATUS_POLLING_MAX_RETRIES',
    Schema.NumberFromString,
  ),
  AUTH_STATUS_POLLING_INITIAL_INTERVAL: Schema.Config(
    'AUTH_STATUS_POLLING_INITIAL_INTERVAL',
    Schema.NumberFromString,
  ),

  KEY_FILE_PATH: Schema.Config('KEY_FILE_PATH', Schema.NonEmptyTrimmedString),
  CERT_FILE_PATH: Schema.Config('CERT_FILE_PATH', Schema.NonEmptyTrimmedString),
  KEY_PASSPHRASE: Config.option(Schema.Config('KEY_PASSPHRASE', Schema.NonEmptyTrimmedString)),

  ALGO_TYPE: Schema.Config(
    'ALGO_TYPE',
    Schema.Union(Schema.Literal('ECDSA'), Schema.Literal('RSA')),
  ),
});
