import { Schema } from 'effect';

export const MessageSchema = Schema.Struct({
  accessToken: Schema.String.pipe(Schema.minLength(1, { message: () => 'Access token is empty' })),
});
