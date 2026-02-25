import { Effect } from 'effect';
import { postApiV2AuthTokenRedeem } from '../../../hey-api-generated-ksef-client';
import { NetworkError } from '../../common/errors';
import { ApiClient } from '../../common/api-client';
import { unwrapApiResponse } from '../../common/unwrap-api-response';

export const redeemAccessToken = (authToken: string) =>
  ApiClient.pipe(
    Effect.flatMap((client) =>
      Effect.tryPromise({
        try: () =>
          postApiV2AuthTokenRedeem({
            client,
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }),
        catch: (cause) => {
          return new NetworkError({ cause: String(cause) });
        },
      }),
    ),
    Effect.flatMap(unwrapApiResponse('postApiV2AuthTokenRedeem')),
  );
