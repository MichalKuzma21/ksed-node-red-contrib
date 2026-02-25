import { Effect } from 'effect';
import { encryptDocument, hashSHA256, importAesKeyFromRawBytes } from '../keys/keys-utils';
import { InteractiveSessionApi } from '../api/interactive-session-service';
import { SendInvoiceWorklowParams, SendInvoiceWorklowResponse } from '../domain/send-invoice';

export const sendInvoiceInInteractiveWorkflow = (params: SendInvoiceWorklowParams) =>
  InteractiveSessionApi.pipe(
    Effect.flatMap((interactiveSessionApi) =>
      Effect.Do.pipe(
        Effect.tap(() =>
          Effect.logInfo('Sending invoice in interactive session', {
            referenceNumber: params.referenceNumber,
          }),
        ),
        Effect.bind('aesKey', () =>
          importAesKeyFromRawBytes(new Uint8Array(Buffer.from(params.aesKeyBase64, 'base64'))),
        ),
        Effect.bind('iv', () =>
          Effect.sync(() => new Uint8Array(Buffer.from(params.ivBase64, 'base64'))),
        ),
        Effect.bind('invoiceBytes', () =>
          Effect.sync(() => new TextEncoder().encode(params.invoiceXml)),
        ),
        Effect.tap(({ invoiceBytes }) =>
          Effect.logDebug('Invoice encoded', { sizeBytes: invoiceBytes.length }),
        ),
        Effect.bind('encryptedDocument', ({ invoiceBytes, aesKey, iv }) =>
          encryptDocument(invoiceBytes, aesKey, iv),
        ),
        Effect.tap(({ encryptedDocument }) =>
          Effect.logDebug('Invoice encrypted', {
            encryptedSizeBytes: encryptedDocument.byteLength,
          }),
        ),
        Effect.bind('hashes', ({ encryptedDocument, invoiceBytes }) =>
          Effect.all([
            hashSHA256(globalThis.crypto)(encryptedDocument),
            hashSHA256(globalThis.crypto)(invoiceBytes),
          ]),
        ),
        Effect.bind('invoiceReferenceNumber', ({ hashes, encryptedDocument, invoiceBytes }) =>
          interactiveSessionApi.sendInvoice(params.accessToken, params.referenceNumber, {
            invoiceHash: Buffer.from(hashes[1]).toString('base64'),
            invoiceSize: invoiceBytes.length,
            encryptedInvoiceHash: Buffer.from(hashes[0]).toString('base64'),
            encryptedInvoiceSize: encryptedDocument.byteLength,
            encryptedInvoiceB64Content: Buffer.from(encryptedDocument).toString('base64'),
            offlineMode: false,
          }),
        ),
        Effect.tap(({ invoiceReferenceNumber }) =>
          Effect.logInfo('Invoice sent, polling for status', {
            invoiceReferenceNumber: invoiceReferenceNumber.referenceNumber,
          }),
        ),
        Effect.bind('sessionStatusRsp', ({ invoiceReferenceNumber }) =>
          interactiveSessionApi.checkStatus(
            params.accessToken,
            params.referenceNumber,
            invoiceReferenceNumber.referenceNumber,
            params.maxRetries,
            params.intervalMs,
          ),
        ),
        Effect.tap(({ sessionStatusRsp }) =>
          Effect.logInfo('Invoice accepted by KSeF', {
            ksefNumber: sessionStatusRsp.ksefNumber,
            code: sessionStatusRsp.status.code,
          }),
        ),
        Effect.map(({ sessionStatusRsp }): SendInvoiceWorklowResponse => {
          return {
            ordinalNumber: sessionStatusRsp.ordinalNumber,
            invoiceNumber: sessionStatusRsp.invoiceNumber ?? undefined,
            ksefNumber: sessionStatusRsp.ksefNumber ?? undefined,
            referenceNumber: sessionStatusRsp.referenceNumber,
            invoiceHash: sessionStatusRsp.invoiceHash,
            invoiceFileName: sessionStatusRsp.invoiceFileName ?? undefined,
            acquisitionDate: sessionStatusRsp.acquisitionDate ?? undefined,
            invoicingDate: sessionStatusRsp.invoicingDate,
            permanentStorageDate: sessionStatusRsp.permanentStorageDate ?? undefined,
            upoDownloadUrl: sessionStatusRsp.upoDownloadUrl ?? undefined,
            upoDownloadUrlExpirationDate:
              sessionStatusRsp.upoDownloadUrlExpirationDate ?? undefined,
            invoicingMode: sessionStatusRsp.invoicingMode ?? undefined,
            code: sessionStatusRsp.status.code,
            description: sessionStatusRsp.status.description,
            details: sessionStatusRsp.status.details,
            extensions: sessionStatusRsp.status.extensions,
          };
        }),
      ),
    ),
  );
