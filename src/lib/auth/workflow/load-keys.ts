import { Config, Effect } from 'effect/index';
import { convertCertToDer, convertKeyToPKCS8Der, loadCert, loadKey } from '../crypto/x509-loader';
import { LoadKeysWorkflowResponse } from '../domain/load-keys';

export const loadKeysWorklow = Effect.Do.pipe(
  Effect.tap(() => Effect.logInfo('Loading certificate and private key')),
  Effect.bind('keyFilePath', () => Config.string('KEY_FILE_PATH')),
  Effect.bind('certFilePath', () => Config.string('CERT_FILE_PATH')),
  Effect.bind('keyPassphrase', () => Config.option(Config.string('KEY_PASSPHRASE'))),
  Effect.tap(({ keyFilePath, certFilePath }) =>
    Effect.logDebug('Key paths resolved', { keyFilePath, certFilePath }),
  ),
  Effect.bind('key', ({ keyFilePath }) => loadKey(keyFilePath)),
  Effect.tap(() => Effect.logDebug('Private key loaded, converting to PKCS8 DER')),
  Effect.bind('keyBuffer', ({ key, keyPassphrase }) => convertKeyToPKCS8Der(key, keyPassphrase)),
  Effect.bind('cert', ({ certFilePath }) => loadCert(certFilePath)),
  Effect.tap(() => Effect.logDebug('Certificate loaded, converting to DER')),
  Effect.bind('certDer', ({ cert }) => convertCertToDer(cert)),
  Effect.tap(() => Effect.logInfo('Keys loaded successfully')),
  Effect.map(
    ({ keyBuffer, certDer }): LoadKeysWorkflowResponse => ({
      keyBuffer: keyBuffer,
      certDer: certDer,
    }),
  ),
);
