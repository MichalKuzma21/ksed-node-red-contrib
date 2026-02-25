import { Config, ConfigProvider, Effect, Layer, Schema } from 'effect/index';
import type { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { MessageSchema } from './message-schema';
import { ApiClientLive, ApiConfig } from '../../lib/common/api-client';
import { sessionApiLive } from '../../lib/interactive-session/api/interactive-session-service';
import { runEffectInNodeRed } from '../common/node-red-effect-runner';
import { sendInvoiceInInteractiveWorkflow } from '../../lib/interactive-session/workflow/send-invoice-workflow';
import { InvalidMessageError } from '../common/errors';
import { SendInvoiceNodeConfig } from './config';
import { validateNodeConfig } from '../common/validate-node-config';

type NodeConfig = NodeDef & Record<string, unknown>;

module.exports = function (RED: NodeAPI) {
  function SendInvoiceNode(this: Node, config: NodeConfig) {
    RED.nodes.createNode(this, config);

    const nodeConfigProvider = ConfigProvider.fromJson({
      BASE_URL: config.base_url,
      DEBUG: config.debug === 'true',
      INVOICE_STATUS_POLLING_MAX_RETRIES: config.invoice_status_polling_max_retries,
      INVOICE_STATUS_POLLING_INITIAL_INTERVAL: config.invoice_status_polling_initial_interval,
    });

    const validatedConfig = validateNodeConfig(
      this,
      SendInvoiceNodeConfig,
      nodeConfigProvider,
      'KSef Send Invoice',
    );
    if (!validatedConfig) return;

    this.on('input', (msg: NodeMessage) => {
      const finalProgram = Effect.Do.pipe(
        Effect.bind('baseUrl', () => Config.string('BASE_URL')),
        Effect.bind('pollingMaxRetries', () =>
          Config.integer('INVOICE_STATUS_POLLING_MAX_RETRIES'),
        ),
        Effect.bind('pollingInitialInterval', () =>
          Config.integer('INVOICE_STATUS_POLLING_INITIAL_INTERVAL'),
        ),
        Effect.bind('decodedMsg', () =>
          Effect.try({
            try: () => Schema.decodeUnknownSync(MessageSchema)(msg),
            catch: (err) =>
              new InvalidMessageError({
                cause: err,
                message: `Schema decode failed: ${err}`,
              }),
          }),
        ),
        Effect.bind(
          'sendInvoiceResult',
          ({ baseUrl, pollingInitialInterval, pollingMaxRetries, decodedMsg }) =>
            sendInvoiceInInteractiveWorkflow({
              maxRetries: pollingMaxRetries,
              intervalMs: pollingInitialInterval,
              accessToken: decodedMsg.accessToken,
              aesKeyBase64: decodedMsg.aesKey,
              ivBase64: decodedMsg.iv,
              referenceNumber: decodedMsg.referenceNumber,
              invoiceXml: decodedMsg.invoiceXml,
            }).pipe(
              Effect.provide(
                Layer.mergeAll(
                  sessionApiLive,
                  ApiClientLive.pipe(Layer.provide(Layer.succeed(ApiConfig, { baseUrl }))),
                ),
              ),
            ),
        ),
      ).pipe(Effect.withConfigProvider(nodeConfigProvider));

      runEffectInNodeRed(this, msg, {
        pendingMessage: 'Send invoice in progress...',
        successMessage: 'Send invoice success',
        errorMessage: 'Send invoice error',
        debug: validatedConfig.DEBUG,
      })(finalProgram);
    });
  }

  RED.nodes.registerType('send-invoice', SendInvoiceNode);
};
