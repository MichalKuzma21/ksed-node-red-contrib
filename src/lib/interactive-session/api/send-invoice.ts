import { Effect, Option } from 'effect';
import {
  postApiV2SessionsOnlineByReferenceNumberInvoices,
  ReferenceNumber,
  Sha256HashBase64,
} from '../../../hey-api-generated-ksef-client';
import { ApiClient } from '../../common/api-client';
import { NetworkError } from '../../common/errors';
import { unwrapApiResponse } from '../../common/unwrap-api-response';

export interface SendInvoiceParams {
  readonly invoiceHash: Sha256HashBase64;
  readonly invoiceSize: number;
  readonly encryptedInvoiceHash: Sha256HashBase64;
  readonly encryptedInvoiceSize: number;
  readonly encryptedInvoiceB64Content: string;
  readonly offlineMode?: boolean;
  readonly hashOfCorrectedInvoice?: Option.Option<Sha256HashBase64>;
}

export const sendInvoice = (
  authToken: string,
  referenceNumber: ReferenceNumber,
  params: SendInvoiceParams,
) =>
  ApiClient.pipe(
    Effect.flatMap((client) =>
      Effect.tryPromise({
        try: () => {
          const baseBody = {
            invoiceHash: params.invoiceHash,
            invoiceSize: params.invoiceSize,
            encryptedInvoiceHash: params.encryptedInvoiceHash,
            encryptedInvoiceSize: params.encryptedInvoiceSize,
            encryptedInvoiceContent: params.encryptedInvoiceB64Content,
            offlineMode: params.offlineMode ?? false,
          };

          const body = Option.match(params.hashOfCorrectedInvoice ?? Option.none(), {
            onNone: () => baseBody,
            onSome: (hash) => ({
              ...baseBody,
              hashOfCorrectedInvoice: hash,
            }),
          });

          return postApiV2SessionsOnlineByReferenceNumberInvoices({
            client,
            body: body,
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
            path: {
              referenceNumber: referenceNumber,
            },
          });
        },
        catch: (cause) =>
          new NetworkError({
            cause: cause,
          }),
      }),
    ),
    Effect.flatMap(unwrapApiResponse('postApiV2SessionsOnlineByReferenceNumberInvoices')),
  );
