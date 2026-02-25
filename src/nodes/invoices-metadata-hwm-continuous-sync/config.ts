import { Schema, Config } from 'effect';

export const InvoiceQueryNodeConfig = Config.all({
  BASE_URL: Schema.Config(
    'BASE_URL',
    Schema.Union(
      Schema.String.pipe(Schema.startsWith('http://')),
      Schema.String.pipe(Schema.startsWith('https://')),
    ),
  ),

  DEBUG: Schema.Config('DEBUG', Schema.BooleanFromString),

  SYNC_INTERVAL_MINUTES: Schema.Config(
    'SYNC_INTERVAL_MINUTES',
    Schema.NumberFromString.pipe(Schema.greaterThan(0)),
  ),

  SUBJECT_TYPE: Schema.Config(
    'SUBJECT_TYPE',
    Schema.Union(
      Schema.Literal('Subject1'),
      Schema.Literal('Subject2'),
      Schema.Literal('Subject3'),
      Schema.Literal('SubjectAuthorized'),
    ),
  ),

  DATE_TYPE: Schema.Config(
    'DATE_TYPE',
    Schema.Union(
      Schema.Literal('Issue'),
      Schema.Literal('Invoicing'),
      Schema.Literal('PermanentStorage'),
    ),
  ),

  RESTRICT_TO_HWM: Config.option(Schema.Config('RESTRICT_TO_HWM', Schema.BooleanFromString)),

  KSEF_NUMBER: Config.option(
    Schema.Config(
      'KSEF_NUMBER',
      Schema.String.pipe(
        Schema.pattern(
          /^([1-9](\d[1-9]|[1-9]\d)\d{7})-(20[2-9][0-9]|2[1-9]\d{2}|[3-9]\d{3})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])-([0-9A-F]{6})-?([0-9A-F]{6})-([0-9A-F]{2})$/,
        ),
      ),
    ),
  ),

  INVOICE_NUMBER: Config.option(
    Schema.Config('INVOICE_NUMBER', Schema.String.pipe(Schema.maxLength(256))),
  ),

  AMOUNT_TYPE: Config.option(
    Schema.Config(
      'AMOUNT_TYPE',
      Schema.Union(Schema.Literal('Brutto'), Schema.Literal('Netto'), Schema.Literal('Vat')),
    ),
  ),

  AMOUNT_FROM: Config.option(Schema.Config('AMOUNT_FROM', Schema.NumberFromString)),

  AMOUNT_TO: Config.option(Schema.Config('AMOUNT_TO', Schema.NumberFromString)),

  SELLER_NIP: Config.option(
    Schema.Config(
      'SELLER_NIP',
      Schema.String.pipe(Schema.pattern(/^[1-9]((\d[1-9])|([1-9]\d))\d{7}$/)),
    ),
  ),

  BUYER_IDENTIFIER_TYPE: Config.option(
    Schema.Config(
      'BUYER_IDENTIFIER_TYPE',
      Schema.Union(
        Schema.Literal('Nip'),
        Schema.Literal('VatUe'),
        Schema.Literal('Other'),
        Schema.Literal('None'),
      ),
    ),
  ),

  BUYER_IDENTIFIER_VALUE: Config.option(Schema.Config('BUYER_IDENTIFIER_VALUE', Schema.String)),

  CURRENCY_CODES: Config.option(Schema.Config('CURRENCY_CODES', Schema.split(','))),

  INVOICING_MODE: Config.option(
    Schema.Config(
      'INVOICING_MODE',
      Schema.Union(Schema.Literal('Online'), Schema.Literal('Offline')),
    ),
  ),

  IS_SELF_INVOICING: Config.option(Schema.Config('IS_SELF_INVOICING', Schema.BooleanFromString)),

  FORM_TYPE: Config.option(
    Schema.Config(
      'FORM_TYPE',
      Schema.Union(Schema.Literal('FA'), Schema.Literal('PEF'), Schema.Literal('RR')),
    ),
  ),

  INVOICE_TYPES: Config.option(Schema.Config('INVOICE_TYPES', Schema.split(','))),

  HAS_ATTACHMENT: Config.option(Schema.Config('HAS_ATTACHMENT', Schema.BooleanFromString)),
});
