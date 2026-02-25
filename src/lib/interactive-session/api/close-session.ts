import { Effect } from 'effect';
import {
  postApiV2SessionsOnlineByReferenceNumberClose,
  ReferenceNumber,
} from '../../../hey-api-generated-ksef-client';
import { ApiClient } from '../../common/api-client';
import { NetworkError } from '../../common/errors';
import { unwrapApiResponse } from '../../common/unwrap-api-response';

export const closeSession = (authToken: string, referenceNumber: ReferenceNumber) =>
  ApiClient.pipe(
    Effect.flatMap((client) =>
      Effect.tryPromise({
        try: () =>
          postApiV2SessionsOnlineByReferenceNumberClose({
            client,
            path: {
              referenceNumber: referenceNumber,
            },
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }),
        catch: (cause) =>
          new NetworkError({
            cause: cause,
          }),
      }),
    ),
    Effect.flatMap(unwrapApiResponse('postApiV2SessionsOnlineByReferenceNumberClose')),
  );
