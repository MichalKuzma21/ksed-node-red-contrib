import { Effect } from 'effect';
import {
  InvoiceQueryFilters,
  postApiV2InvoicesQueryMetadata,
} from '../../../../hey-api-generated-ksef-client';
import { NetworkError } from '../../../common/errors';
import { ApiClient } from '../../../common/api-client';
import { unwrapApiResponse } from '../../../common/unwrap-api-response';

export const fetchMetadata = (
  authToken: string,
  invoiceQueryFilters: InvoiceQueryFilters,
  pageOffset: number,
) =>
  ApiClient.pipe(
    Effect.flatMap((client) =>
      Effect.tryPromise({
        try: () =>
          postApiV2InvoicesQueryMetadata({
            body: invoiceQueryFilters,
            query: {
              pageOffset: pageOffset,
              pageSize: 250,
            },
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
            client: client,
          }),
        catch: (cause) => {
          return new NetworkError({ cause: cause });
        },
      }),
    ),
  ).pipe(Effect.flatMap(unwrapApiResponse('postApiV2InvoicesQueryMetadata')));
