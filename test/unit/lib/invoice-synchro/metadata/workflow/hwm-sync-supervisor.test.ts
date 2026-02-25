import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Effect, Fiber, Option, Stream, SubscriptionRef, SynchronizedRef } from 'effect';
import {
  supervisor,
  cleanFilters,
  ListenOnState,
} from '../../../../../../src/lib/invoice-synchro/invoice-metadata-sync/workflow/hwm-sync-supervisor';
import { InvoiceWithHwm } from '../../../../../../src/lib/invoice-synchro/invoice-metadata-sync/domain/models';
import type { Node } from 'node-red';
import type {
  InvoiceQueryFilters,
  InvoiceMetadata,
} from '../../../../../../src/hey-api-generated-ksef-client/types.gen';

vi.mock(
  '../../../../../../src/lib/invoice-synchro/invoice-metadata-sync/workflow/hwm-sync-workflow',
  () => ({
    startHwmIncrementalInvoiceFetching: vi.fn(),
  }),
);

import { startHwmIncrementalInvoiceFetching } from '../../../../../../src/lib/invoice-synchro/invoice-metadata-sync/workflow/hwm-sync-workflow';

const mockStartSync = vi.mocked(startHwmIncrementalInvoiceFetching);

const DEBOUNCE_SLACK_MS = 700; // 400ms debounce + 300ms safety margin

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const createMockNode = (): Node =>
  ({
    status: vi.fn(),
    send: vi.fn(),
    error: vi.fn(),
  }) as unknown as Node;

// ──────────────────────────────────────────────────────────────────────────────
describe('cleanFilters', () => {
  it('passes through non-object primitives unchanged', () => {
    expect(cleanFilters('hello')).toBe('hello');
    expect(cleanFilters(42)).toBe(42);
    expect(cleanFilters(true)).toBe(true);
  });

  it('returns undefined for null', () => {
    expect(cleanFilters(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(cleanFilters(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(cleanFilters('')).toBeUndefined();
  });

  it('removes null and empty-string fields from objects', () => {
    const result = cleanFilters({ a: 'value', b: null, c: '', d: undefined });
    expect(result).toEqual({ a: 'value' });
  });

  it('returns undefined when all object values are empty', () => {
    expect(cleanFilters({ a: null, b: '' })).toBeUndefined();
  });

  it('recursively cleans nested objects', () => {
    const result = cleanFilters({ outer: { keep: 'yes', drop: null }, top: null });
    expect(result).toEqual({ outer: { keep: 'yes' } });
  });

  it('removes nested object when all its values clean to undefined', () => {
    const result = cleanFilters({ nested: { a: null }, other: 'keep' });
    expect(result).toEqual({ other: 'keep' });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('supervisor', () => {
  let stateRef: SubscriptionRef.SubscriptionRef<ListenOnState>;
  let authTokenRef: SynchronizedRef.SynchronizedRef<Option.Option<string>>;
  let node: Node;
  let fiber: Fiber.RuntimeFiber<unknown, unknown>;

  beforeEach(() => {
    vi.resetAllMocks();
    stateRef = Effect.runSync(
      SubscriptionRef.make<ListenOnState>({ fromDate: null, running: false }),
    );
    authTokenRef = Effect.runSync(
      SynchronizedRef.make<Option.Option<string>>(Option.some('test-token')),
    );
    node = createMockNode();
  });

  afterEach(async () => {
    if (fiber) {
      await Effect.runPromise(Fiber.interrupt(fiber));
    }
  });

  const startSupervisor = () => {
    fiber = Effect.runFork(
      // @ts-expect-error: Ignorujemy TS2345 w tym teście
      supervisor({
        stateRef,
        authTokenRef,
        node,
        syncIntervalMinutes: 60,
        invoiceQueryFilters: {} as InvoiceQueryFilters,
      }),
    );
  };

  const setState = (patch: Partial<ListenOnState>) =>
    Effect.runPromise(SubscriptionRef.update(stateRef, (s) => ({ ...s, ...patch })));

  // ── initial state ──────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('sets node status to Stopped on startup when running=false', async () => {
      mockStartSync.mockReturnValue(Stream.never as any);
      startSupervisor();

      await wait(DEBOUNCE_SLACK_MS);

      expect(node.status).toHaveBeenCalledWith({ fill: 'grey', shape: 'ring', text: 'Stopped' });
      expect(mockStartSync).not.toHaveBeenCalled();
    });
  });

  // ── start ──────────────────────────────────────────────────────────────────
  describe('start', () => {
    it('starts sync and sets Syncing status when running=true with fromDate', async () => {
      mockStartSync.mockReturnValue(Stream.never as any);
      startSupervisor();

      await setState({ fromDate: new Date('2024-01-01'), running: true });
      await wait(DEBOUNCE_SLACK_MS);

      expect(node.status).toHaveBeenCalledWith({
        fill: 'blue',
        shape: 'dot',
        text: 'Syncing invoices...',
      });
      expect(mockStartSync).toHaveBeenCalledOnce();
    });

    it('does not start sync when fromDate is null even if running=true', async () => {
      mockStartSync.mockReturnValue(Stream.never as any);
      startSupervisor();

      await setState({ fromDate: null, running: true });
      await wait(DEBOUNCE_SLACK_MS);

      expect(node.status).toHaveBeenCalledWith({ fill: 'grey', shape: 'ring', text: 'Stopped' });
      expect(mockStartSync).not.toHaveBeenCalled();
    });
  });

  // ── stop signal ────────────────────────────────────────────────────────────
  describe('stop signal', () => {
    it('sets node status to Stopped when running becomes false during active sync', async () => {
      mockStartSync.mockReturnValue(Stream.never as any);
      startSupervisor();

      await setState({ fromDate: new Date('2024-01-01'), running: true });
      await wait(DEBOUNCE_SLACK_MS);
      expect(node.status).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Syncing invoices...' }),
      );

      await setState({ running: false });
      await wait(DEBOUNCE_SLACK_MS);

      expect(node.status).toHaveBeenCalledWith({ fill: 'grey', shape: 'ring', text: 'Stopped' });
    });

    it('does not start another sync cycle after stop', async () => {
      mockStartSync.mockReturnValue(Stream.never as any);
      startSupervisor();

      await setState({ fromDate: new Date('2024-01-01'), running: true });
      await wait(DEBOUNCE_SLACK_MS);
      expect(mockStartSync).toHaveBeenCalledTimes(1);

      await setState({ running: false });
      await wait(DEBOUNCE_SLACK_MS);

      expect(mockStartSync).toHaveBeenCalledTimes(1);
    });
  });

  // ── invoice emission ───────────────────────────────────────────────────────
  describe('invoice emission', () => {
    it('sends each invoice as first output via node.send', async () => {
      const invoiceMetadata = {
        ksefNumber: 'INV/001',
        permanentStorageDate: '2024-01-01',
      } as InvoiceMetadata;
      const element = new InvoiceWithHwm({
        invoice: invoiceMetadata,
        permanentStorageHwmDate: '2024-01-01',
      });

      mockStartSync.mockReturnValue(Stream.make(element) as any);
      startSupervisor();

      await setState({ fromDate: new Date('2024-01-01'), running: true });
      await wait(DEBOUNCE_SLACK_MS);

      expect(node.send).toHaveBeenCalledWith([{ payload: invoiceMetadata }, null]);
    });
  });
});
