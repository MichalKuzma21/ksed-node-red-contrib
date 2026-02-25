import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cloneFiltersWithDate,
  getInvoiceStream,
} from '../../../../../../src/lib/invoice-synchro/invoice-metadata-sync/workflow/hwm-sync-workflow';
import { Effect, Layer, Option, SynchronizedRef, Stream, Chunk } from 'effect';
import * as KsefApiSdk from '../../../../../../src/hey-api-generated-ksef-client/sdk.gen';
import type { Client } from '../../../../../../src/hey-api-generated-ksef-client/client/types.gen';
import type {
  InvoiceQueryFilters,
  InvoiceMetadata,
} from '../../../../../../src/hey-api-generated-ksef-client/types.gen';
import { ApiClient } from '../../../../../../src/lib/common/api-client';
import {
  InvoiceWithHwm,
  HwmOnly,
} from '../../../../../../src/lib/invoice-synchro/invoice-metadata-sync/domain/models';

vi.mock('../../../../../../src/hey-api-generated-ksef-client/sdk.gen');

const mockApiClient = {} as Client;
const apiClientLayer = Layer.succeed(ApiClient, mockApiClient);
const mockPost = vi.mocked(KsefApiSdk.postApiV2InvoicesQueryMetadata);

const defaultFilters: InvoiceQueryFilters = {
  dateRange: { dateType: 'Issue', from: '2023-01-01', to: '2023-01-31' },
  subjectType: 'Subject1',
};

const initialFromDate = '2023-01-01T00:00:00.000Z';

const mockPage = (data: object) =>
  mockPost.mockResolvedValueOnce({ data, error: undefined } as any);

type OptionalDeep<T> = {
  [K in keyof T]?: T[K] extends object ? OptionalDeep<T[K]> : T[K];
};

function createMockInvoiceMetadata(overrides: OptionalDeep<InvoiceMetadata> = {}): InvoiceMetadata {
  return {
    ksefNumber: 'KSEF123456',
    invoiceNumber: 'INV-2026/01',
    issueDate: '2026-02-24',
    invoicingDate: '2026-02-24',
    acquisitionDate: '2026-02-23',
    permanentStorageDate: '2026-02-24',
    seller: {
      name: 'Acme Corp',
      nip: '8888888888',
    },
    buyer: {
      identifier: { type: 'Nip', value: '9999999999' },
      name: 'Beta Ltd',
    },
    netAmount: 1000,
    grossAmount: 1230,
    vatAmount: 230,
    currency: 'PLN',
    invoicingMode: 'Online',
    invoiceType: 'Vat',
    formCode: { systemCode: 'FA', schemaVersion: '1-0E', value: 'FA' },
    isSelfInvoicing: false,
    hasAttachment: true,
    invoiceHash: 'base64hash==',
    hashOfCorrectedInvoice: null,
    thirdSubjects: null,
    authorizedSubject: null,
    ...overrides,
  } as InvoiceMetadata;
}

const runStream = (authTokenRef: SynchronizedRef.SynchronizedRef<Option.Option<string>>) =>
  Effect.runPromise(
    getInvoiceStream(authTokenRef, defaultFilters, initialFromDate).pipe(
      Stream.runCollect,
      Effect.map(Chunk.toReadonlyArray),
      Effect.provide(apiClientLayer),
    ),
  );

describe('cloneFiltersWithDate', () => {
  it('should clone filters and update the "from" date', () => {
    const original: InvoiceQueryFilters = {
      dateRange: { dateType: 'Issue', from: '2023-01-01', to: '2023-01-31' },
      subjectType: 'Subject1',
    };
    const cloned = cloneFiltersWithDate(original, '2023-02-01');

    expect(cloned).not.toBe(original);
    expect(cloned.dateRange?.from).toBe('2023-02-01');
    expect(cloned.dateRange?.dateType).toBe(original.dateRange?.dateType);
    expect(cloned.subjectType).toBe(original.subjectType);
  });

  it('should not modify dateRange if it is undefined', () => {
    const original: InvoiceQueryFilters = {
      subjectType: 'Subject1',
      dateRange: { dateType: 'Issue', from: '', to: '' },
    };
    const cloned = cloneFiltersWithDate(original, '2023-02-01');

    expect(cloned).not.toBe(original);
    expect(cloned.subjectType).toBe(original.subjectType);
  });
});

describe('getInvoiceStream', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return a single page of invoices', async () => {
    const authTokenRef = Effect.runSync(SynchronizedRef.make(Option.some('mock_token')));
    const invoice1 = createMockInvoiceMetadata({
      ksefNumber: 'INV/001',
      permanentStorageDate: '2023-01-01',
    });
    const invoice2 = createMockInvoiceMetadata({
      ksefNumber: 'INV/002',
      permanentStorageDate: '2023-01-01',
    });

    mockPage({
      invoices: [invoice1, invoice2],
      hasMore: false,
      isTruncated: false,
      pageSize: 2,
      permanentStorageHwmDate: '2023-01-01',
    });

    const result = await runStream(authTokenRef);

    expect(result.length).toBe(2);
    expect(result[0]).toEqual(
      new InvoiceWithHwm({ invoice: invoice1, permanentStorageHwmDate: '2023-01-01' }),
    );
    expect(result[1]).toEqual(
      new InvoiceWithHwm({ invoice: invoice2, permanentStorageHwmDate: '2023-01-01' }),
    );
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('should paginate correctly by pageOffset', async () => {
    const authTokenRef = Effect.runSync(SynchronizedRef.make(Option.some('mock_token')));
    const invoice1 = createMockInvoiceMetadata({
      ksefNumber: 'INV/001',
      permanentStorageDate: '2023-01-01',
    });
    const invoice2 = createMockInvoiceMetadata({
      ksefNumber: 'INV/002',
      permanentStorageDate: '2023-01-01',
    });
    const invoice3 = createMockInvoiceMetadata({
      ksefNumber: 'INV/003',
      permanentStorageDate: '2023-01-02',
    });

    mockPage({
      invoices: [invoice1, invoice2],
      hasMore: true,
      isTruncated: false,
      pageSize: 2,
      permanentStorageHwmDate: '2023-01-01',
    });
    mockPage({
      invoices: [invoice3],
      hasMore: false,
      isTruncated: false,
      pageSize: 1,
      permanentStorageHwmDate: '2023-01-02',
    });

    const result = await runStream(authTokenRef);

    expect(result.length).toBe(3);
    expect(result[0]).toEqual(
      new InvoiceWithHwm({ invoice: invoice1, permanentStorageHwmDate: '2023-01-01' }),
    );
    expect(result[2]).toEqual(
      new InvoiceWithHwm({ invoice: invoice3, permanentStorageHwmDate: '2023-01-02' }),
    );
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('should paginate by date when isTruncated is true', async () => {
    const authTokenRef = Effect.runSync(SynchronizedRef.make(Option.some('mock_token')));
    const invoiceA = createMockInvoiceMetadata({
      ksefNumber: 'INV/A',
      permanentStorageDate: '2023-01-15',
    });
    const invoiceB = createMockInvoiceMetadata({
      ksefNumber: 'INV/B',
      permanentStorageDate: '2023-01-15',
    });
    const invoiceC = createMockInvoiceMetadata({
      ksefNumber: 'INV/C',
      permanentStorageDate: '2023-01-20',
    });

    mockPage({
      invoices: [invoiceA, invoiceB],
      hasMore: true,
      isTruncated: true,
      pageSize: 2,
      permanentStorageHwmDate: '2023-01-15',
    });
    mockPage({
      invoices: [invoiceC],
      hasMore: false,
      isTruncated: false,
      pageSize: 1,
      permanentStorageHwmDate: '2023-01-20',
    });

    const result = await runStream(authTokenRef);

    expect(result.length).toBe(3);
    expect(result[2]).toEqual(
      new InvoiceWithHwm({ invoice: invoiceC, permanentStorageHwmDate: '2023-01-20' }),
    );
    expect(mockPost).toHaveBeenCalledTimes(2);

    // second call should use the last invoice's permanentStorageDate as 'from'
    expect(mockPost.mock.calls[1][0]).toMatchObject({
      body: expect.objectContaining({ dateRange: expect.objectContaining({ from: '2023-01-15' }) }),
    });
  });

  it('should emit HwmOnly when page has no invoices', async () => {
    const authTokenRef = Effect.runSync(SynchronizedRef.make(Option.some('mock_token')));

    mockPage({
      invoices: [],
      hasMore: false,
      isTruncated: false,
      pageSize: 0,
      permanentStorageHwmDate: '2023-01-10',
    });

    const result = await runStream(authTokenRef);

    expect(result.length).toBe(1);
    expect(result[0]).toEqual(new HwmOnly({ permanentStorageHwmDate: '2023-01-10' }));
  });
});
