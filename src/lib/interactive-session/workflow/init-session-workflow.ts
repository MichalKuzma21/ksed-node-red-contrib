import { Effect } from 'effect/index';
import {
  encryptAesKeyWithRsa,
  exportAesKeyToRawBytes,
  generateAesKeyAndIv,
  importKsefPublicKey,
} from '../keys/keys-utils';
import { NoKsefPublicKeyFoundError } from '../api/errors';
import { fetchKsefPublicKeyCertificate } from '../api/fetch-ksef-public-key';
import { InteractiveSessionApi } from '../api/interactive-session-service';
import { InitSessionWorkflowParams, InitSessionWorkflowResponse } from '../domain/init-session';
import { SYMMETRIC_KEY_ENCRYPTION } from '../domain/usage-field-values';

export const initSessionWorkflow = (params: InitSessionWorkflowParams) =>
  Effect.Do.pipe(
    Effect.tap(() => Effect.logInfo('Initializing KSeF interactive session')),
    Effect.bind('sessionService', () => InteractiveSessionApi),
    Effect.bind('keyIVTuple', () => generateAesKeyAndIv(globalThis.crypto)),
    Effect.tap(() => Effect.logDebug('AES session key generated')),
    Effect.bind('certificates', () => fetchKsefPublicKeyCertificate),
    Effect.tap(({ certificates }) =>
      Effect.logDebug('KSeF public key certificates fetched', { count: certificates.length }),
    ),
    Effect.bind('validCert', ({ certificates }) => {
      const cert = certificates.find((c) => c.usage.some((u) => u === SYMMETRIC_KEY_ENCRYPTION));
      if (!cert) {
        return Effect.fail(
          new NoKsefPublicKeyFoundError({
            message: `No certificate found with usage ${SYMMETRIC_KEY_ENCRYPTION} from list of ${certificates.length} certificates`,
          }),
        );
      }
      return Effect.succeed(cert.certificate);
    }),
    Effect.bind('publicKey', ({ validCert }) => importKsefPublicKey(validCert)),
    Effect.tap(() => Effect.logDebug('Session key encrypted with KSeF public key')),
    Effect.bind('encryptedKey', ({ keyIVTuple, publicKey }) =>
      encryptAesKeyWithRsa(keyIVTuple.key, publicKey),
    ),
    Effect.bind('rsp', ({ sessionService, encryptedKey, keyIVTuple }) =>
      sessionService.openSession(
        params.accessToken,
        {
          systemCode: params.formCodeSystemCode,
          schemaVersion: params.formCodeSchemaVersion,
          value: params.formCodeValue,
        },
        {
          encryptedSymmetricKey: Buffer.from(encryptedKey).toString('base64'),
          initializationVector: Buffer.from(keyIVTuple.iv).toString('base64'),
        },
      ),
    ),
    Effect.tap(({ rsp }) =>
      Effect.logInfo('Interactive session opened', { referenceNumber: rsp.referenceNumber }),
    ),
    Effect.bind('aesKeyBytes', ({ keyIVTuple }) => exportAesKeyToRawBytes(keyIVTuple.key)),
    Effect.map(
      ({ rsp, aesKeyBytes, keyIVTuple }): InitSessionWorkflowResponse => ({
        referenceNumber: rsp.referenceNumber,
        aesKeyBase64: Buffer.from(aesKeyBytes).toString('base64'),
        ivBase64: Buffer.from(keyIVTuple.iv).toString('base64'),
      }),
    ),
  );
