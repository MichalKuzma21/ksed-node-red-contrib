import { Config, ConfigProvider, Effect, Layer, Schema } from 'effect/index';
import type { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { MessageSchema } from './message-schema';
import { ApiConfig, ApiClientLive } from '../../lib/common/api-client';
import { authApiLive } from '../../lib/auth/api/auth-service';
import { runEffectInNodeRed } from '../common/node-red-effect-runner';
import { InvalidMessageError } from '../common/errors';
import { RefreshTokenNodeConfig } from './config';
import { refreshAccessTokenWorkflow } from '../../lib/auth/workflow/refresh-token';
import { validateNodeConfig } from '../common/validate-node-config';

type NodeConfig = NodeDef & Record<string, unknown>;

module.exports = function (RED: NodeAPI) {
  function RefreshToken(this: Node, config: NodeConfig) {
    RED.nodes.createNode(this, config);

    const nodeConfigProvider = ConfigProvider.fromJson({
      BASE_URL: config.base_url,
      DEBUG: config.debug === 'true',
    });

    const validatedConfig = validateNodeConfig(
      this,
      RefreshTokenNodeConfig,
      nodeConfigProvider,
      'KSef Refresh Token',
    );
    if (!validatedConfig) return;

    this.on('input', (msg: NodeMessage) => {
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
        Effect.flatMap(({ baseUrl, decodedMsg }) => {
          const apiClientLayer = ApiClientLive.pipe(
            Layer.provide(Layer.succeed(ApiConfig, { baseUrl })),
          );
          return refreshAccessTokenWorkflow({ tokenValue: decodedMsg.accessToken }).pipe(
            Effect.provide(Layer.merge(authApiLive, apiClientLayer)),
          );
        }),
      ).pipe(Effect.withConfigProvider(nodeConfigProvider));

      runEffectInNodeRed(this, msg, {
        pendingMessage: 'Refresh token in progress...',
        successMessage: 'Refresh token success',
        errorMessage: 'Refresh token error',
        debug: validatedConfig.DEBUG,
      })(program);
    });
  }

  RED.nodes.registerType('refresh-token', RefreshToken);
};
