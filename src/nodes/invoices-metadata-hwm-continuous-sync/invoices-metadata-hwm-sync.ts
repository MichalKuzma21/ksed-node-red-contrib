import {
  ConfigProvider,
  Effect,
  Fiber,
  Layer,
  Logger,
  LogLevel,
  Option,
  SubscriptionRef,
  SynchronizedRef,
} from 'effect/index';
import type { Node, NodeAPI, NodeDef } from 'node-red';
import { InvoiceQueryFilters } from '../../hey-api-generated-ksef-client';
import { ApiConfig, ApiClientLive } from '../../lib/common/api-client';
import { indexSyncApiLive } from '../../lib/invoice-synchro/invoice-metadata-sync/api/index-sync-service';
import {
  ListenOnState,
  supervisor,
  updateAuthToken,
  cleanFilters,
} from '../../lib/invoice-synchro/invoice-metadata-sync/workflow/hwm-sync-supervisor';
import { InvoiceQueryNodeConfig } from './config';
import { validateNodeConfig } from '../common/validate-node-config';

type NodeConfig = NodeDef & Record<string, unknown>;

module.exports = function (RED: NodeAPI) {
  function InvoicesMetadataHwmSync(this: Node, config: NodeConfig) {
    RED.nodes.createNode(this, config);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const node = this; // needed: captured by Effect.gen generator functions where `this` is unbound

    const opt = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

    const nodeConfigProvider = ConfigProvider.fromJson({
      BASE_URL: config.base_url,
      DEBUG: config.debug,
      SYNC_INTERVAL_MINUTES: config.sync_interval_minutes,
      SUBJECT_TYPE: config.subject_type,
      DATE_TYPE: config.date_type,
      RESTRICT_TO_HWM: opt(config.restrict_to_hwm),
      KSEF_NUMBER: opt(config.ksef_number),
      INVOICE_NUMBER: opt(config.invoice_number),
      AMOUNT_TYPE: opt(config.amount_type),
      AMOUNT_FROM: opt(config.amount_from),
      AMOUNT_TO: opt(config.amount_to),
      SELLER_NIP: opt(config.seller_nip),
      BUYER_IDENTIFIER_TYPE: opt(config.buyer_identifier_type),
      BUYER_IDENTIFIER_VALUE: opt(config.buyer_identifier_value),
      CURRENCY_CODES: opt(config.currency_codes),
      INVOICING_MODE: opt(config.invoicing_mode),
      IS_SELF_INVOICING: opt(config.is_self_invoicing),
      FORM_TYPE: opt(config.form_type),
      INVOICE_TYPES: opt(config.invoice_types),
      HAS_ATTACHMENT: opt(config.has_attachment),
    });

    const validatedConfig = validateNodeConfig(
      this,
      InvoiceQueryNodeConfig,
      nodeConfigProvider,
      'KSeF Invoices Metadata Sync',
    );
    if (!validatedConfig) return;

    const syncState = Effect.runSync(
      SubscriptionRef.make<ListenOnState>({ fromDate: null, running: false }),
    );
    const authTokenRef = Effect.runSync(SynchronizedRef.make<Option.Option<string>>(Option.none()));

    const queryFilter = cleanFilters({
      dateRange: {
        dateType: validatedConfig.DATE_TYPE,
      },
      subjectType: validatedConfig.SUBJECT_TYPE,
      ksefNumber: Option.getOrUndefined(validatedConfig.KSEF_NUMBER),
      amount: {
        type: Option.getOrUndefined(validatedConfig.AMOUNT_TYPE),
        from: Option.getOrUndefined(validatedConfig.AMOUNT_FROM),
        to: Option.getOrUndefined(validatedConfig.AMOUNT_TO),
      },
      sellerNip: Option.getOrUndefined(validatedConfig.SELLER_NIP),
      buyerIdentifier: {
        type: Option.getOrUndefined(validatedConfig.BUYER_IDENTIFIER_TYPE),
        value: Option.getOrUndefined(validatedConfig.BUYER_IDENTIFIER_VALUE),
      },
      currencyCodes: Option.getOrUndefined(validatedConfig.CURRENCY_CODES),
      invoicingMode: Option.getOrUndefined(validatedConfig.INVOICING_MODE),
      isSelfInvoicing: Option.getOrUndefined(validatedConfig.IS_SELF_INVOICING),
      formType: Option.getOrUndefined(validatedConfig.FORM_TYPE),
      invoiceTypes: Option.getOrUndefined(validatedConfig.INVOICE_TYPES),
      hasAttachment: Option.getOrUndefined(validatedConfig.HAS_ATTACHMENT),
    } as InvoiceQueryFilters) as InvoiceQueryFilters;

    const program = supervisor({
      stateRef: syncState,
      authTokenRef,
      node,
      syncIntervalMinutes: validatedConfig.SYNC_INTERVAL_MINUTES,
      invoiceQueryFilters: queryFilter,
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          node.error('Supervisor crashed: ' + String(error));
          node.status({ fill: 'red', shape: 'ring', text: 'Error' });
        }),
      ),
      Effect.provide(
        Layer.mergeAll(
          indexSyncApiLive,
          ApiClientLive.pipe(
            Layer.provide(Layer.succeed(ApiConfig, { baseUrl: validatedConfig.BASE_URL })),
          ),
        ),
      ),
    );

    const supervisorFiber = Effect.runFork(
      program.pipe(
        Logger.withMinimumLogLevel(validatedConfig.DEBUG ? LogLevel.Debug : LogLevel.Info),
        Effect.onInterrupt(() => Effect.logInfo('Supervisor interrupted')),
      ),
    );

    node.on('input', (msg, _send, done) => {
      const effect = Effect.gen(function* (_) {
        switch (msg.topic) {
          case 'authToken': {
            const authToken = (msg.payload as { accessToken: { token: string } }).accessToken.token;
            yield* updateAuthToken(authTokenRef, authToken);
            yield* _(
              Effect.sync(() =>
                node.status({ fill: 'green', shape: 'dot', text: 'Token updated' }),
              ),
            );
            break;
          }
          case 'from': {
            const from = new Date((msg.payload as { dateFrom: string }).dateFrom);
            if (isNaN(from.getTime())) {
              yield* _(Effect.sync(() => node.error('Invalid from date', msg)));
              return;
            }
            yield* _(
              SubscriptionRef.update(syncState, (s) => ({ ...s, fromDate: from, running: true })),
            );
            break;
          }
          case 'stop': {
            yield* _(SubscriptionRef.update(syncState, (s) => ({ ...s, running: false })));
            break;
          }
        }
      });
      Effect.runPromise(effect).finally(done);
    });

    node.on('close', (_: boolean, done: () => void) => {
      Effect.logInfo('Node closing – interrupting supervisor fiber')
        .pipe(Effect.zipRight(Fiber.interrupt(supervisorFiber)))
        .pipe(Effect.runPromise)
        .finally(done);
      node.status({ fill: 'red', shape: 'ring', text: 'Stopped by node' });
    });
  }

  RED.nodes.registerType('invoices-metadata-hwm-sync', InvoicesMetadataHwmSync);
};
