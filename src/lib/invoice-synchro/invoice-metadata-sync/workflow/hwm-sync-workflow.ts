import { Chunk, Effect, Option, Ref, Schedule, Stream, SynchronizedRef } from 'effect';
import { DurationInput } from 'effect/Duration';
import type {
  InvoiceMetadata,
  InvoiceQueryFilters,
} from '../../../../hey-api-generated-ksef-client/types.gen';
import { HighWaterMark } from '../domain/high-water-mark';
import { HwmOnly, InvoiceWithHwm, StreamElement } from '../domain/models';
import { FetchMetadataMissingAuthTokenError } from '../errors';
import { fetchMetadata } from '../api/fetch-metadata';

type AuthTokenRef = SynchronizedRef.SynchronizedRef<Option.Option<string>>;

interface PaginationState {
  readonly from: string;
  readonly pageOffset: number;
}

export const cloneFiltersWithDate = (
  filters: InvoiceQueryFilters,
  date: string,
): InvoiceQueryFilters => {
  const cloned = structuredClone(filters);
  if (cloned.dateRange) cloned.dateRange.from = date;
  return cloned;
};

const buildChunk = (rsp: {
  invoices: InvoiceMetadata[];
  permanentStorageHwmDate?: string | null;
}): Chunk.Chunk<StreamElement> =>
  rsp.invoices.length > 0
    ? Chunk.map(
        Chunk.fromIterable(rsp.invoices),
        (invoice) =>
          new InvoiceWithHwm({
            invoice,
            permanentStorageHwmDate: rsp.permanentStorageHwmDate ?? '',
          }),
      )
    : rsp.permanentStorageHwmDate
      ? Chunk.of(new HwmOnly({ permanentStorageHwmDate: rsp.permanentStorageHwmDate }))
      : Chunk.empty<StreamElement>();

const nextPaginationState = (
  rsp: { hasMore: boolean; isTruncated: boolean; invoices: InvoiceMetadata[] },
  state: PaginationState,
  chunk: Chunk.Chunk<StreamElement>,
): Effect.Effect<readonly [Chunk.Chunk<StreamElement>, Option.Option<PaginationState>]> => {
  if (!rsp.hasMore) {
    return Effect.logInfo('No more invoices to fetch').pipe(
      Effect.as([chunk, Option.none()] as const),
    );
  }

  if (!rsp.isTruncated) {
    return Effect.logInfo('Continuing pagination with next pageOffset', {
      nextPageOffset: state.pageOffset + 1,
    }).pipe(
      Effect.as([
        chunk,
        Option.some({ from: state.from, pageOffset: state.pageOffset + 1 }),
      ] as const),
    );
  }

  const lastInvoiceDate = rsp.invoices[rsp.invoices.length - 1].permanentStorageDate;
  return Effect.logInfo("Pagination truncated – moving 'from' cursor", {
    newFrom: lastInvoiceDate,
  }).pipe(Effect.as([chunk, Option.some({ from: lastInvoiceDate, pageOffset: 0 })] as const));
};

const fetchPage = (authToken: AuthTokenRef, filters: InvoiceQueryFilters, state: PaginationState) =>
  Effect.gen(function* () {
    const token = yield* SynchronizedRef.get(authToken);
    yield* Effect.logInfo(token ? 'Auth token present' : 'Auth token missing');
    if (Option.isNone(token)) {
      return yield* Effect.fail(
        new FetchMetadataMissingAuthTokenError({ message: 'Missing auth token' }),
      );
    }
    const rsp = yield* fetchMetadata(token.value, filters, state.pageOffset);
    yield* Effect.logInfo('Fetched invoice metadata page', {
      invoicesCount: rsp.invoices.length,
      hasMore: rsp.hasMore,
      isTruncated: rsp.isTruncated,
    });
    return rsp;
  });
export const getInvoiceStream = (
  authToken: AuthTokenRef,
  filters: InvoiceQueryFilters,
  initialFrom: string,
) =>
  Stream.paginateChunkEffect({ from: initialFrom, pageOffset: 0 } as PaginationState, (state) =>
    Effect.Do.pipe(
      Effect.bind('rsp', () =>
        fetchPage(authToken, cloneFiltersWithDate(filters, state.from), state).pipe(
          Effect.catchTag('FetchMetadataMissingAuthTokenError', (err) =>
            Effect.logError('Cannot fetch metadata, auth token is missing', err).pipe(
              Effect.zipRight(Effect.fail(Option.none())),
            ),
          ),
        ),
      ),
      Effect.tap(({ rsp }) =>
        Effect.logInfo('Pagination iteration', {
          currentFrom: state.from,
          pageOffset: state.pageOffset,
          invoicesCount: rsp.invoices.length,
          hasMore: rsp.hasMore,
          isTruncated: rsp.isTruncated,
        }),
      ),
      Effect.bind('chunk', ({ rsp }) => Effect.sync(() => buildChunk(rsp))),
      Effect.flatMap(({ rsp, chunk }) => nextPaginationState(rsp, state, chunk)),
    ),
  );

const updateHwm = (hwm: Ref.Ref<HighWaterMark>, element: StreamElement) =>
  Effect.Do.pipe(
    Effect.tap(() =>
      element._tag === 'InvoiceWithHwm'
        ? Effect.logInfo('Invoice emitted', {
            invoiceId: element.invoice.ksefNumber,
            invoicePermanentStorageDate: element.invoice.permanentStorageDate,
          })
        : Effect.logInfo('HwmOnly emitted (no invoices)', {
            permanentStorageHwmDate: element.permanentStorageHwmDate,
          }),
    ),
    Effect.zipRight(
      Ref.update(hwm, (current) => {
        const incoming = HighWaterMark.fromISOString(element.permanentStorageHwmDate);
        return incoming.isAfter(current) ? incoming.increment() : current;
      }),
    ),
  );

export const startHwmIncrementalInvoiceFetching = (
  authToken: AuthTokenRef,
  filters: InvoiceQueryFilters,
  interval: DurationInput,
  initialFrom: Date,
) =>
  Stream.unwrap(
    Effect.Do.pipe(
      Effect.bind('hwm', () => Ref.make(HighWaterMark.fromDate(initialFrom))),
      Effect.map(({ hwm }) => {
        const pollOnce = Stream.fromEffect(Ref.get(hwm)).pipe(
          Stream.flatMap((hwmValue) =>
            getInvoiceStream(authToken, filters, hwmValue.toISOString()),
          ),
          Stream.tap((element) => updateHwm(hwm, element)),
          Stream.filterMap((element) =>
            element._tag === 'InvoiceWithHwm' ? Option.some(element) : Option.none(),
          ),
        );

        return pollOnce.pipe(Stream.repeat(Schedule.spaced(interval)));
      }),
    ),
  );
