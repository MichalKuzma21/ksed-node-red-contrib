import { Config, ConfigProvider, Effect, Layer } from 'effect/index';
import type { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { ApiConfig, ApiClientLive } from '../../lib/common/api-client';
import { authApiLive } from '../../lib/auth/api/auth-service';
import { runEffectInNodeRed } from '../common/node-red-effect-runner';
import { loadKeysWorklow } from '../../lib/auth/workflow/load-keys';
import { authenticateWorkflow } from '../../lib/auth/workflow/authenticate';
import { AuthenticationNodeConfig } from './config';
import { validateNodeConfig } from '../common/validate-node-config';

type NodeConfig = NodeDef & Record<string, unknown>;

module.exports = function (RED: NodeAPI) {
  function Authentication(this: Node, config: NodeConfig) {
    RED.nodes.createNode(this, config);

    const nodeConfigProvider = ConfigProvider.fromJson({
      BASE_URL: config.base_url,
      DEBUG: config.debug,
      VERIFY_CERTIFICATE_CHAIN: config.verify_certificate_chain,
      SUBJECT_IDENTIFIER_TYPE: config.subject_identifier_type,
      CONTEXT_IDENTIFIER_TYPE: config.context_identifier_type,
      CONTEXT_IDENTIFIER_VALUE: config.context_identifier_value,
      AUTH_STATUS_POLLING_MAX_RETRIES: config.auth_status_polling_max_retries,
      AUTH_STATUS_POLLING_INITIAL_INTERVAL: config.auth_status_polling_initial_interval,
      KEY_FILE_PATH: config.key_file_path,
      CERT_FILE_PATH: config.cert_file_path,
      KEY_PASSPHRASE: (this.credentials as { key_passphrase?: string }).key_passphrase,
      ALGO_TYPE: config.algo_type,
    });

    const validatedConfig = validateNodeConfig(
      this,
      AuthenticationNodeConfig,
      nodeConfigProvider,
      'KSef Auth',
    );
    if (!validatedConfig) return;

    this.on('input', (msg: NodeMessage) => {
      const program = Effect.Do.pipe(
        Effect.bind('baseUrl', () => Config.string('BASE_URL')),
        Effect.bind('algoType', () => Config.literal('ECDSA', 'RSA')('ALGO_TYPE')),
        Effect.bind('keys', () => loadKeysWorklow),
        Effect.flatMap(({ keys, baseUrl, algoType }) => {
          const algo: RsaHashedImportParams | EcKeyImportParams =
            algoType === 'ECDSA'
              ? { name: 'ECDSA', namedCurve: 'P-256' }
              : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
          const apiClientLayer = ApiClientLive.pipe(
            Layer.provide(Layer.succeed(ApiConfig, { baseUrl })),
          );
          return authenticateWorkflow({
            pemKey: keys.keyBuffer,
            x509cert: keys.certDer,
            algo: algo,
          }).pipe(Effect.provide(Layer.merge(authApiLive, apiClientLayer)));
        }),
      ).pipe(Effect.withConfigProvider(nodeConfigProvider));

      runEffectInNodeRed(this, msg, {
        pendingMessage: 'Authorization in progress...',
        successMessage: 'Authorization success',
        errorMessage: 'Authorization error',
        debug: validatedConfig.DEBUG,
      })(program);
    });
  }

  RED.nodes.registerType('authentication', Authentication, {
    credentials: {
      key_passphrase: { type: 'password' },
    },
  });
};
