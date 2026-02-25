import { Schema } from 'effect';

export const MessageSchema = Schema.Struct({
  xml: Schema.String,
  ksefNumber: Schema.String.pipe(
    Schema.pattern(
      /^([1-9]((\d[1-9])|([1-9]\d))\d{7}|M\d{9}|[A-Z]{3}\d{7})-(20[2-9][0-9]|2[1-9][0-9]{2}|[3-9][0-9]{3})(0[1-9]|1[0-2])(0[1-9]|[1-2][0-9]|3[0-1])-(([0-9A-F]{6}-[0-9A-F]{6})|([0-9A-F]{12}))-([0-9A-F]{2})$/,
    ),
  ),
  qrCodeURL: Schema.NonEmptyTrimmedString,
  isMobile: Schema.BooleanFromString,
});
