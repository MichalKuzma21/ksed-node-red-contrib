import { Context, Effect, Layer } from 'effect';
import {
  EncryptionInfo,
  FormCode,
  OpenOnlineSessionResponse,
  ReferenceNumber,
  SendInvoiceResponse,
  SessionInvoiceStatusResponse,
} from '../../../hey-api-generated-ksef-client';
import { openSession } from './open-session';
import { closeSession } from './close-session';
import { sendInvoice, SendInvoiceParams } from './send-invoice';
import { checkStatus } from './invoice-status-polling';
import { InvoiceStatusFatalError, InvoiceStatusRetryableError } from './errors';
import { ApiClient } from '../../common/api-client';
import { KsefApiError, NetworkError } from '../../common/errors';

export type { SendInvoiceParams };

export class InteractiveSessionApi extends Context.Tag('InteractiveSessionApi')<
  InteractiveSessionApi,
  {
    readonly openSession: (
      authToken: string,
      formCode: FormCode,
      encryptionInfo: EncryptionInfo,
    ) => Effect.Effect<OpenOnlineSessionResponse, KsefApiError, ApiClient>;
    readonly closeSession: (
      authToken: string,
      referenceNumber: ReferenceNumber,
    ) => Effect.Effect<void, KsefApiError, ApiClient>;
    readonly sendInvoice: (
      authToken: string,
      referenceNumber: ReferenceNumber,
      params: SendInvoiceParams,
    ) => Effect.Effect<SendInvoiceResponse, KsefApiError, ApiClient>;
    readonly checkStatus: (
      authToken: string,
      referenceNumber: ReferenceNumber,
      invoiceReferenceNumber: ReferenceNumber,
      maxRetries: number,
      intervalMs: number,
    ) => Effect.Effect<
      SessionInvoiceStatusResponse,
      NetworkError | InvoiceStatusFatalError | InvoiceStatusRetryableError,
      ApiClient
    >;
  }
>() {}

export const sessionApiLive = Layer.succeed(InteractiveSessionApi, {
  openSession,
  closeSession,
  sendInvoice,
  checkStatus,
});
