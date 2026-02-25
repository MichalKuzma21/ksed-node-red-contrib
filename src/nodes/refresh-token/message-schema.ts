import { Schema } from 'effect';

export const MessageSchema = Schema.Struct({
  accessToken: Schema.String,
});
