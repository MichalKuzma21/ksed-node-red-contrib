import { Effect } from 'effect';
import {
  getApiV2AuthByReferenceNumber,
  ReferenceNumber,
  TokenInfo,
} from '../../../hey-api-generated-ksef-client';

import { NetworkError } from '../../common/errors';
import { ApiClient } from '../../common/api-client';
import { unwrapApiResponse } from '../../common/unwrap-api-response';

export const getAuthStatus = (ref: ReferenceNumber, token: TokenInfo) =>
  ApiClient.pipe(
    Effect.flatMap((client) =>
      Effect.tryPromise({
        try: () =>
          getApiV2AuthByReferenceNumber({
            auth: token.token,
            path: { referenceNumber: ref },
            client,
          }),
        catch: (cause) => new NetworkError({ cause }),
      }),
    ),
    Effect.flatMap(unwrapApiResponse('getApiV2AuthByReferenceNumber')),
  );
