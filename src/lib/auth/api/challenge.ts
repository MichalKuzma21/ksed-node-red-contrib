import { Effect } from 'effect';
import { postApiV2AuthChallenge } from '../../../hey-api-generated-ksef-client';
import { ApiClient } from '../../common/api-client';
import { unwrapApiResponse } from '../../common/unwrap-api-response';
import { NetworkError } from '../../common/errors';

export const getChallenge = ApiClient.pipe(
  Effect.flatMap((client) =>
    Effect.tryPromise({
      try: () =>
        postApiV2AuthChallenge({
          client,
        }),
      catch: (cause) => new NetworkError({ cause: cause }),
    }).pipe(Effect.flatMap(unwrapApiResponse('postApiV2AuthChallenge'))),
  ),
);
