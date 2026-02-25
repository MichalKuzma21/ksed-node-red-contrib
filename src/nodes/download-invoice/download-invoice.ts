import { Config, ConfigProvider, Effect, Layer, Schema } from 'effect/index';
import type { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { MessageSchema } from './message-schema';
import { invoiceDownloadApiLive } from '../../lib/invoice-synchro/invoice-download/api/invoice-download-api';
import { ApiConfig, ApiClientLive } from '../../lib/common/api-client';
import { runEffectInNodeRed } from '../common/node-red-effect-runner';
import { InvalidMessageError } from '../common/errors';
import { downloadInvoiceWorkflow } from '../../lib/invoice-synchro/invoice-download/workflow/download-invoice-workflow';
import { DownloadInvoiceNodeConfig } from './config';
import { validateNodeConfig } from '../common/validate-node-config';

type NodeConfig = NodeDef & Record<string, unknown>;

module.exports = function (RED: NodeAPI) {
  function DownloadInvoice(this: Node, config: NodeConfig) {
    RED.nodes.createNode(this, config);

    const nodeConfig = ConfigProvider.fromJson({
      BASE_URL: config.base_url,
      DEBUG: config.debug === 'true',
    });

    const validatedConfig = validateNodeConfig(
      this,
      DownloadInvoiceNodeConfig,
      nodeConfig,
      'KSef Download Invoice',
    );
    if (!validatedConfig) return;

    this.on('input', (msg: NodeMessage) => {
      this.status({ fill: 'blue', shape: 'dot', text: 'Downloading invoice...' });

      const program = Effect.Do.pipe(
        Effect.bind('baseUrl', () => Config.string('BASE_URL')),
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
        Effect.bind('invoiceRsp', ({ decodedMsg, baseUrl }) =>
          downloadInvoiceWorkflow({
            authToken: decodedMsg.authToken,
            ksefNumber: decodedMsg.ksefNumber,
          }).pipe(
            Effect.provide(
              Layer.mergeAll(
                invoiceDownloadApiLive,
                ApiClientLive.pipe(Layer.provide(Layer.succeed(ApiConfig, { baseUrl: baseUrl }))),
              ),
            ),
          ),
        ),
        Effect.map(({ invoiceRsp }) => ({
          invoiceTxt: invoiceRsp.xmlContent,
          decodedMsg: msg.payload,
        })),
      ).pipe(Effect.withConfigProvider(nodeConfig));

      runEffectInNodeRed(this, msg, {
        pendingMessage: 'Download invoice in progress...',
        successMessage: 'Download invoice success',
        errorMessage: 'Download invoice error',
        debug: validatedConfig.DEBUG,
      })(program);
    });
  }

  RED.nodes.registerType('download-invoice', DownloadInvoice);
};
