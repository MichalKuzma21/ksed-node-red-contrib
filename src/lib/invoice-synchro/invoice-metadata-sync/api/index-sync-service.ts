import { Context, Effect, Layer } from 'effect';
import {
  InvoiceQueryFilters,
  QueryInvoicesMetadataResponse,
} from '../../../../hey-api-generated-ksef-client';
import { ApiClient } from '../../../common/api-client';
import { KsefApiError } from '../../../common/errors';
import { fetchMetadata } from './fetch-metadata';

export class IndexSyncApi extends Context.Tag('IndexSyncApi')<
  IndexSyncApi,
  {
    readonly fetchMetadata: (
      authToken: string,
      invoiceQueryFilters: InvoiceQueryFilters,
      pageOffset: number,
    ) => Effect.Effect<QueryInvoicesMetadataResponse, KsefApiError, ApiClient>;
  }
>() {}

export const indexSyncApiLive = Layer.succeed(IndexSyncApi, {
  fetchMetadata,
});
