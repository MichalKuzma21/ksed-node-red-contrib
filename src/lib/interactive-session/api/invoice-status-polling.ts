import { Match, Effect, Schedule, Duration } from 'effect';
import {
  getApiV2SessionsByReferenceNumberInvoicesByInvoiceReferenceNumber,
  ReferenceNumber,
} from '../../../hey-api-generated-ksef-client';
import { InvoiceStatusError, InvoiceStatusFatalError, InvoiceStatusRetryableError } from './errors';
import { NetworkError } from '../../common/errors';
import { ApiClient } from '../../common/api-client';
import { classifyStatusCode } from '../domain/invoice-status-codes';

const retryPolicy = (maxRetries: number, interval: number) =>
  Schedule.intersect(
    Schedule.recurWhile(
      (error: unknown) => (error as InvoiceStatusError)?._tag === 'InvoiceStatusRetryableError',
    ),
    Schedule.intersect(Schedule.spaced(Duration.millis(interval)), Schedule.recurs(maxRetries)),
  ).pipe(
    Schedule.tapInput((error: unknown) =>
      Effect.sync(() => {
        const err = error as InvoiceStatusRetryableError;
        return Effect.logInfo(`Retrying due to: ${err.code} - ${err.description}`);
      }),
    ),
  );

export const checkStatus = (
  authToken: string,
  referenceNumber: ReferenceNumber,
  invoiceReferenceNumber: ReferenceNumber,
  maxRetries: number,
  intervalMs: number,
) =>
  ApiClient.pipe(
    Effect.flatMap((client) =>
      Effect.retry(
        Effect.tryPromise({
          try: () =>
            getApiV2SessionsByReferenceNumberInvoicesByInvoiceReferenceNumber({
              client,
              auth: authToken,
              path: {
                referenceNumber: referenceNumber,
                invoiceReferenceNumber: invoiceReferenceNumber,
              },
            }),
          catch: (cause) => {
            return new NetworkError({
              cause: cause,
            });
          },
        }).pipe(
          Effect.flatMap((rsp) => {
            const data = rsp.data!;
            const { code, description, details: rawDetails } = data.status;
            const details = rawDetails ?? [];
            const category = classifyStatusCode(code);
            return Match.value(category).pipe(
              Match.when('SUCCESS', () => Effect.succeed(data)),
              Match.when('RETRYABLE', () =>
                Effect.fail<InvoiceStatusError>(
                  new InvoiceStatusRetryableError({
                    code,
                    description,
                    details,
                  }),
                ),
              ),
              Match.orElse(() =>
                Effect.fail<InvoiceStatusError>(
                  new InvoiceStatusFatalError({
                    code,
                    description,
                    details,
                  }),
                ),
              ),
            );
          }),
        ),
        retryPolicy(maxRetries, intervalMs),
      ),
    ),
  );
