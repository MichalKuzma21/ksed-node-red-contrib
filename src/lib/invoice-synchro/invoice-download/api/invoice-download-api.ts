import { Context, Effect, Layer } from 'effect';
import {
  GetApiV2InvoicesKsefByKsefNumberResponse,
  KsefNumber,
} from '../../../../hey-api-generated-ksef-client';
import { ApiClient } from '../../../common/api-client';
import { KsefApiError } from '../../../common/errors';
import { fetchInvoice as fetchInvoiceImpl } from './fetch-invoice';

export class InvoiceDownloadApi extends Context.Tag('InvoiceDownloadApi')<
  InvoiceDownloadApi,
  {
    readonly fetchInvoice: (
      authToken: string,
      ksefNumber: KsefNumber,
    ) => Effect.Effect<GetApiV2InvoicesKsefByKsefNumberResponse, KsefApiError, ApiClient>;
  }
>() {}

export const invoiceDownloadApiLive = Layer.succeed(InvoiceDownloadApi, {
  fetchInvoice: fetchInvoiceImpl,
});
