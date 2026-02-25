import { Config, ConfigProvider, Effect, Layer, Schema } from 'effect/index';
import type { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { ApiClientLive, ApiConfig } from '../../lib/common/api-client';
import { sessionApiLive } from '../../lib/interactive-session/api/interactive-session-service';
import { runEffectInNodeRed } from '../common/node-red-effect-runner';
import { closeSessionWorkflow } from '../../lib/interactive-session/workflow/close-session-workflow';
import { InvalidMessageError } from '../common/errors';
import { MessageSchema } from './message-schema';
import { CloseInteractiveSessionNodeConfig } from './config';
import { validateNodeConfig } from '../common/validate-node-config';

type NodeConfig = NodeDef & Record<string, unknown>;

module.exports = function (RED: NodeAPI) {
  function CloseInteractiveSession(this: Node, config: NodeConfig) {
    RED.nodes.createNode(this, config);

    const nodeConfig = ConfigProvider.fromJson({
      BASE_URL: config.base_url,
      DEBUG: config.debug === 'true',
    });

    const validatedConfig = validateNodeConfig(
      this,
      CloseInteractiveSessionNodeConfig,
      nodeConfig,
      'KSef Close Session',
    );
    if (!validatedConfig) return;

    this.on('input', (msg: NodeMessage) => {
      this.status({ fill: 'blue', shape: 'dot', text: 'Sending invoice...' });

      const finalProgram = Effect.Do.pipe(
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
        Effect.bind('openSessionResult', ({ decodedMsg, baseUrl }) =>
          closeSessionWorkflow({
            accessToken: decodedMsg.accessToken,
            referenceNumber: decodedMsg.referenceNumber,
          }).pipe(
            Effect.provide(
              Layer.mergeAll(
                sessionApiLive,
                ApiClientLive.pipe(Layer.provide(Layer.succeed(ApiConfig, { baseUrl }))),
              ),
            ),
          ),
        ),
      ).pipe(Effect.withConfigProvider(nodeConfig));

      runEffectInNodeRed(this, msg, {
        pendingMessage: 'Close interactive session in progress...',
        successMessage: 'Close interactive session success',
        errorMessage: 'Close interactive session error',
        debug: validatedConfig.DEBUG,
      })(finalProgram);
    });
  }

  RED.nodes.registerType('close-interactive-session', CloseInteractiveSession);
};
