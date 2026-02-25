import { Config, ConfigProvider, Effect, Layer, Schema } from 'effect/index';
import type { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { MessageSchema } from './message-schema';
import { ApiClientLive, ApiConfig } from '../../lib/common/api-client';
import { sessionApiLive } from '../../lib/interactive-session/api/interactive-session-service';
import { runEffectInNodeRed } from '../common/node-red-effect-runner';
import { initSessionWorkflow } from '../../lib/interactive-session/workflow/init-session-workflow';
import { InvalidMessageError } from '../common/errors';
import { InitInteractiveSessionNodeConfig as InitInteractiveSessionNodeConfig } from './config';
import { validateNodeConfig } from '../common/validate-node-config';

type NodeConfig = NodeDef & Record<string, unknown>;

module.exports = function (RED: NodeAPI) {
  function InitInteractiveSession(this: Node, config: NodeConfig) {
    RED.nodes.createNode(this, config);

    const nodeConfigProvider = ConfigProvider.fromJson({
      BASE_URL: config.base_url,
      DEBUG: config.debug === 'true',
      FORM_CODE_SCHEMA_CODE: config.form_code_system_code,
      FORM_CODE_SCHEMA_VERSION: config.form_code_schema_version,
      FORM_CODE_VALUE: config.form_code_value,
    });

    const validatedConfig = validateNodeConfig(
      this,
      InitInteractiveSessionNodeConfig,
      nodeConfigProvider,
      'KSef Init Session',
    );
    if (!validatedConfig) return;

    this.on('input', (msg: NodeMessage) => {
      this.status({ fill: 'blue', shape: 'dot', text: 'Sending invoice...' });
      const finalProgram = Effect.Do.pipe(
        Effect.bind('baseUrl', () => Config.string('BASE_URL')),
        Effect.bind('fcSchemaCode', () => Config.string('FORM_CODE_SCHEMA_CODE')),
        Effect.bind('fcSchemaVersion', () => Config.string('FORM_CODE_SCHEMA_VERSION')),
        Effect.bind('fcValue', () => Config.string('FORM_CODE_VALUE')),
        Effect.tap(({ fcSchemaCode, fcSchemaVersion, fcValue }) =>
          Effect.logInfo('Opening session for form code', {
            fcSchemaCode,
            fcSchemaVersion,
            fcValue,
          }),
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
          'initSessionResult',
          ({ decodedMsg, baseUrl, fcSchemaCode, fcSchemaVersion, fcValue }) =>
            initSessionWorkflow({
              accessToken: decodedMsg.accessToken,
              formCodeSchemaVersion: fcSchemaVersion,
              formCodeValue: fcValue,
              formCodeSystemCode: fcSchemaCode,
            }).pipe(
              Effect.provide(
                Layer.mergeAll(
                  sessionApiLive,
                  ApiClientLive.pipe(Layer.provide(Layer.succeed(ApiConfig, { baseUrl: baseUrl }))),
                ),
              ),
            ),
        ),
      ).pipe(Effect.withConfigProvider(nodeConfigProvider));

      runEffectInNodeRed(this, msg, {
        pendingMessage: 'Init session in progress...',
        successMessage: 'Init session success',
        errorMessage: 'Init session error',
        debug: validatedConfig.DEBUG,
      })(finalProgram);
    });
  }

  RED.nodes.registerType('init-interactive-session', InitInteractiveSession);
};
