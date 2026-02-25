import { Effect, Schema } from 'effect/index';
import type { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { MessageSchema } from './message-schema';
import { type InvoiceGenerationInput } from './invoice-generator-adapter';
import { runEffectInNodeRed } from '../common/node-red-effect-runner';
import { generateVisualizationWorkflow } from '../../lib/invoice-visualization/workflow/generate-visualization';
import { InvalidMessageError } from '../common/errors';

type NodeConfig = NodeDef & Record<string, unknown>;

module.exports = function (RED: NodeAPI) {
  function InvoiceVisualization(this: Node, config: NodeConfig) {
    RED.nodes.createNode(this, config);

    this.on('input', (msg: NodeMessage) => {
      const generateInvoiceFlow = Effect.Do.pipe(
        Effect.bind('decodedMsg', () =>
          Effect.try({
            try: () => Schema.decodeUnknownSync(MessageSchema)(msg),
            catch: (err) =>
              new InvalidMessageError({
                cause: err,
                message: `Schema decode failed: ${err})}`,
              }),
          }),
        ),
        Effect.bind('invoiceInput', ({ decodedMsg }) =>
          Effect.succeed<InvoiceGenerationInput>({
            xmlContent: decodedMsg.xml,
            ksefNumber: decodedMsg.ksefNumber,
            qrCodeURL: decodedMsg.qrCodeURL,
            isMobile: decodedMsg.isMobile,
          }),
        ),
        Effect.flatMap(({ invoiceInput }) => {
          return generateVisualizationWorkflow(invoiceInput);
        }),
      );

      runEffectInNodeRed(this, msg, {
        pendingMessage: 'Visualization in progress...',
        successMessage: 'Visualization success',
        errorMessage: 'Visualization error',
      })(generateInvoiceFlow);
    });
  }

  RED.nodes.registerType('invoice-visualization', InvoiceVisualization);
};
