import { Schema, Config } from 'effect';

export const DownloadInvoiceNodeConfig = Config.all({
  BASE_URL: Schema.Config(
    'BASE_URL',
    Schema.Union(
      Schema.String.pipe(Schema.startsWith('http://')),
      Schema.String.pipe(Schema.startsWith('https://')),
    ),
  ),

  DEBUG: Schema.Config('DEBUG', Schema.BooleanFromString),
});
