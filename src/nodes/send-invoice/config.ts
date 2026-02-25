import { Schema, Config } from 'effect';

export const SendInvoiceNodeConfig = Config.all({
  BASE_URL: Schema.Config(
    'BASE_URL',
    Schema.Union(
      Schema.String.pipe(Schema.startsWith('http://')),
      Schema.String.pipe(Schema.startsWith('https://')),
    ),
  ),

  DEBUG: Schema.Config('DEBUG', Schema.BooleanFromString),
  INVOICE_STATUS_POLLING_MAX_RETRIES: Schema.Config(
    'INVOICE_STATUS_POLLING_MAX_RETRIES',
    Schema.NumberFromString,
  ),
  INVOICE_STATUS_POLLING_INITIAL_INTERVAL: Schema.Config(
    'INVOICE_STATUS_POLLING_INITIAL_INTERVAL',
    Schema.NumberFromString,
  ),
});
