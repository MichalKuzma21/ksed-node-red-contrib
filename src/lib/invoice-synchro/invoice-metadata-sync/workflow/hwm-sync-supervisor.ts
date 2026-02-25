import { Effect, Duration, Stream, SubscriptionRef, SynchronizedRef, Option } from 'effect/index';
import { Node } from 'node-red';
import { InvoiceQueryFilters } from '../../../../hey-api-generated-ksef-client';
import { startHwmIncrementalInvoiceFetching } from './hwm-sync-workflow';

export type ListenOnState = {
  fromDate: Date | null;
  running: boolean;
};

export interface SupervisorParams {
  stateRef: SubscriptionRef.SubscriptionRef<ListenOnState>;
  authTokenRef: SynchronizedRef.SynchronizedRef<Option.Option<string>>;
  node: Node;
  syncIntervalMinutes: number;
  invoiceQueryFilters: InvoiceQueryFilters;
}

const stopSync = (node: Node) =>
  Effect.logInfo('Stopping invoice sync').pipe(
    Effect.zipRight(
      Effect.sync(() => node.status({ fill: 'grey', shape: 'ring', text: 'Stopped' })),
    ),
  );

const onStreamError = (params: SupervisorParams) => (error: unknown) =>
  Effect.logError('Stream error occurred', error)
    .pipe(
      Effect.zipRight(
        Effect.sync(() => {
          params.node.status({ fill: 'red', shape: 'ring', text: 'Error - sync stopped' });
          params.node.send([null, { payload: JSON.stringify(error) }]);
        }),
      ),
      Effect.zipRight(SubscriptionRef.update(params.stateRef, (s) => ({ ...s, running: false }))),
    )
    .pipe(Effect.orDie);

const runInvoiceSync = (params: SupervisorParams, fromDate: Date) => {
  const stream = startHwmIncrementalInvoiceFetching(
    params.authTokenRef,
    params.invoiceQueryFilters,
    Duration.minutes(params.syncIntervalMinutes),
    fromDate,
  ).pipe(Stream.onError(onStreamError(params)));

  const stopSignal = params.stateRef.changes.pipe(
    Stream.filter((s) => !s.running),
    Stream.take(1),
    Stream.runDrain,
  );

  return Effect.logInfo('Starting invoice HWM sync', { fromDate: fromDate.toISOString() }).pipe(
    Effect.zipRight(
      Effect.sync(() =>
        params.node.status({ fill: 'blue', shape: 'dot', text: 'Syncing invoices...' }),
      ),
    ),
    Effect.zipRight(
      Stream.runForEach(stream, (invoice) =>
        Effect.sync(() => params.node.send([{ payload: invoice.invoice }, null])),
      ).pipe(
        Effect.race(stopSignal),
        Effect.catchAll((error) =>
          Effect.logError('Stream processing failed', error).pipe(
            Effect.zipRight(
              Effect.sync(() => {
                params.node.status({ fill: 'red', shape: 'ring', text: 'Sync failed' });
                params.node.error('Invoice sync failed');
                params.node.send([null, { payload: JSON.stringify(error) }]);
              }),
            ),
            Effect.zipRight(
              SubscriptionRef.update(params.stateRef, (s) => ({ ...s, running: false })),
            ),
          ),
        ),
        Effect.ensuring(Effect.logInfo('Stream processing cleanup completed')),
      ),
    ),
  );
};

const handleStateChange = (params: SupervisorParams) => (state: ListenOnState) =>
  !state.running || !state.fromDate
    ? stopSync(params.node)
    : runInvoiceSync(params, state.fromDate);

export const supervisor = (params: SupervisorParams) =>
  Effect.Do.pipe(
    Effect.let('changes', () =>
      params.stateRef.changes.pipe(Stream.debounce(Duration.millis(400))),
    ),
    Effect.flatMap(({ changes }) =>
      Stream.runForEach(changes, (state) =>
        handleStateChange(params)(state).pipe(
          Effect.catchAll((error) =>
            Effect.logError('Supervisor iteration failed', error).pipe(
              Effect.zipRight(
                Effect.sync(() => {
                  params.node.status({ fill: 'red', shape: 'ring', text: 'Error' });
                  params.node.error('Supervisor iteration error', error);
                  params.node.send([null, { payload: JSON.stringify(error) }]);
                }),
              ),
            ),
          ),
        ),
      ),
    ),
    Effect.orDie,
  );

export const updateAuthToken = (
  authTokenRef: SynchronizedRef.SynchronizedRef<Option.Option<string>>,
  token: string,
) => SynchronizedRef.set(authTokenRef, Option.some(token));

export const cleanFilters = (filters: unknown): unknown => {
  if (filters === null || filters === undefined) return undefined;
  if (typeof filters === 'string') return filters === '' ? undefined : filters;
  if (typeof filters !== 'object') return filters;

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    const cleanedValue = cleanFilters(value);
    if (cleanedValue !== undefined) {
      cleaned[key] = cleanedValue;
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
};
