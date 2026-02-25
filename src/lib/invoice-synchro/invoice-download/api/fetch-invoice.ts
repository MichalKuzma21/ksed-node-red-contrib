import { Effect } from 'effect';
import {
  getApiV2InvoicesKsefByKsefNumber,
  KsefNumber,
} from '../../../../hey-api-generated-ksef-client';
import { NetworkError } from '../../../common/errors';
import { ApiClient } from '../../../common/api-client';
import { unwrapApiResponse } from '../../../common/unwrap-api-response';

export const fetchInvoice = (authToken: string, ksefNumber: KsefNumber) =>
  ApiClient.pipe(
    Effect.flatMap((client) =>
      Effect.tryPromise({
        try: () =>
          getApiV2InvoicesKsefByKsefNumber({
            client,
            path: {
              ksefNumber: ksefNumber,
            },
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }),
        catch: (cause) => new NetworkError({ cause: cause }),
      }),
    ),
    Effect.flatMap(unwrapApiResponse('getApiV2InvoicesKsefByKsefNumber')),
  );
