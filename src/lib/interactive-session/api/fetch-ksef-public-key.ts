import { Effect } from 'effect/index';
import { getApiV2SecurityPublicKeyCertificates } from '../../../hey-api-generated-ksef-client/sdk.gen';
import { ApiClient } from '../../common/api-client';
import { NetworkError } from '../../common/errors';
import { unwrapApiResponse } from '../../common/unwrap-api-response';

export const fetchKsefPublicKeyCertificate = ApiClient.pipe(
  Effect.flatMap((client) =>
    Effect.tryPromise({
      try: () =>
        getApiV2SecurityPublicKeyCertificates({
          client,
        }),
      catch: (cause) => new NetworkError({ cause: cause }),
    }),
  ),
  Effect.flatMap(unwrapApiResponse('getApiV2SecurityPublicKeyCertificates')),
);
