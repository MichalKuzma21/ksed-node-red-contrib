import { Context, Effect, Layer } from 'effect';
import { createClient } from '../../hey-api-generated-ksef-client/client';

export class ApiConfig extends Context.Tag('ApiConfig')<
  ApiConfig,
  { readonly baseUrl: string }
>() {}

export type ApiClientType = ReturnType<typeof createClient>;

export class ApiClient extends Context.Tag('ApiClient')<ApiClient, ApiClientType>() {}

export const ApiClientLive = Layer.effect(
  ApiClient,
  ApiConfig.pipe(
    Effect.map((config) =>
      createClient({
        baseUrl: config.baseUrl,
      }),
    ),
  ),
);
