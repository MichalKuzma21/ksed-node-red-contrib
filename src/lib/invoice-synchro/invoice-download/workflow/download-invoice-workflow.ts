import { Effect } from 'effect/index';
import { InvoiceDownloadApi } from '../api/invoice-download-api';
import { InvoiceDeserializationError } from '../errors';
import {
  DownloadInvoiceWorkflowParams,
  DownloadInvoiceWorkflowResponse,
} from '../domain/download-invoice';

export const downloadInvoiceWorkflow = (params: DownloadInvoiceWorkflowParams) => {
  return Effect.Do.pipe(
    Effect.tap(() => Effect.logInfo('Downloading invoice', { ksefNumber: params.ksefNumber })),
    Effect.bind('result', () =>
      InvoiceDownloadApi.pipe(
        Effect.flatMap((api) => api.fetchInvoice(params.authToken, params.ksefNumber)),
      ),
    ),
    Effect.tap(() => Effect.logDebug('Invoice response received, deserializing')),
    Effect.flatMap(({ result }) =>
      Effect.tryPromise({
        //This files should be small, so i think i can call .text() safely
        try: () => result.text(),
        catch: (err) =>
          new InvoiceDeserializationError({
            cause: err,
            message: `Unpacking invoice failed`,
          }),
      }),
    ),
    Effect.tap(() =>
      Effect.logInfo('Invoice downloaded successfully', { ksefNumber: params.ksefNumber }),
    ),
    Effect.map((xmlContent): DownloadInvoiceWorkflowResponse => ({ xmlContent })),
  );
};
