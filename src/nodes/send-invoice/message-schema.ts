import { Schema } from 'effect';

export const MessageSchema = Schema.Struct({
  accessToken: Schema.String.pipe(Schema.minLength(1, { message: () => 'Access token is empty' })),
  invoiceXml: Schema.String.pipe(Schema.minLength(1, { message: () => 'XML payload is empty' })),
  aesKey: Schema.String.pipe(Schema.minLength(1, { message: () => 'AES Key is empty' })),
  iv: Schema.String.pipe(Schema.minLength(1, { message: () => 'IV is empty' })),
  referenceNumber: Schema.String.pipe(
    Schema.minLength(1, { message: () => 'Reference number is empty' }),
  ),
});
