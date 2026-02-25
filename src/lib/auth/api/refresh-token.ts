import { Effect } from 'effect';
import { postApiV2AuthTokenRefresh } from '../../../hey-api-generated-ksef-client';
import { ApiClient } from '../../common/api-client';
import { NetworkError } from '../../common/errors';
import { unwrapApiResponse } from '../../common/unwrap-api-response';

export const refreshToken = (refreshToken: string) =>
  ApiClient.pipe(
    Effect.flatMap((client) =>
      Effect.tryPromise({
        try: () =>
          postApiV2AuthTokenRefresh({
            client,
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }),
        catch: (cause) => new NetworkError({ cause }),
      }),
    ),
    Effect.flatMap(unwrapApiResponse('postApiV2AuthTokenRefresh')),
  );
