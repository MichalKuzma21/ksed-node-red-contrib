import { Schema, Config } from 'effect';

export const InitInteractiveSessionNodeConfig = Config.all({
  BASE_URL: Schema.Config(
    'BASE_URL',
    Schema.Union(
      Schema.String.pipe(Schema.startsWith('http://')),
      Schema.String.pipe(Schema.startsWith('https://')),
    ),
  ),
  DEBUG: Schema.Config('DEBUG', Schema.BooleanFromString),
  FORM_CODE_SCHEMA_CODE: Schema.Config('FORM_CODE_SCHEMA_CODE', Schema.NonEmptyTrimmedString),
  FORM_CODE_SCHEMA_VERSION: Schema.Config('FORM_CODE_SCHEMA_VERSION', Schema.NonEmptyTrimmedString),
  FORM_CODE_VALUE: Schema.Config('FORM_CODE_VALUE', Schema.NonEmptyTrimmedString),
});
