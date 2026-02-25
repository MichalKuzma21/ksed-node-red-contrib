import { Schema } from 'effect';

export const MessageSchema = Schema.Struct({
  ksefNumber: Schema.String.pipe(
    Schema.pattern(
      /^([1-9](\d[1-9]|[1-9]\d)\d{7})-(20[2-9][0-9]|2[1-9]\d{2}|[3-9]\d{3})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])-([0-9A-F]{6})-?([0-9A-F]{6})-([0-9A-F]{2})$/,
    ),
  ),
  authToken: Schema.String,
});
