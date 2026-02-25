import { Effect, pipe } from 'effect';
import { HashingError } from '../api/errors';
import * as x509 from '@peculiar/x509';
import { EncryptionError, KeyLoadingError } from './errors';

const AES_KEY_LENGTH = 256;
const IV_LENGTH_BYTES = 16;

const AES_ALG = { name: 'AES-CBC', length: AES_KEY_LENGTH };
const RSA_OAEP_ENCRYPT_PARAMS = { name: 'RSA-OAEP', hash: 'SHA-256' };

export const importKsefPublicKey = (cert: string) => {
  return Effect.tryPromise({
    try: () => {
      const certificate = new x509.X509Certificate(cert);
      return crypto.subtle.importKey(
        'spki',
        certificate.publicKey.rawData,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['encrypt'],
      );
    },
    catch: (e) =>
      new KeyLoadingError({
        cause: e,
        message: `RSA key import error: ${String(e)}`,
      }),
  });
};

export type KeyIVTuple = {
  key: CryptoKey;
  iv: Uint8Array<ArrayBuffer>;
};

export const hashSHA256 =
  (crypto: typeof globalThis.crypto) => (value: Uint8Array<ArrayBuffer>) => {
    return Effect.tryPromise({
      try: () => crypto.subtle.digest('SHA-256', value),
      catch: (cause) =>
        new HashingError({
          message: "Can't create hash on provided value",
          cause: cause,
        }),
    });
  };

export const generateAesKeyAndIv = (
  crypto: typeof globalThis.crypto,
): Effect.Effect<KeyIVTuple, EncryptionError> =>
  pipe(
    Effect.sync(() => crypto.getRandomValues(new Uint8Array(new ArrayBuffer(IV_LENGTH_BYTES)))),
    Effect.flatMap((iv) =>
      pipe(
        Effect.tryPromise({
          try: () => crypto.subtle.generateKey(AES_ALG, true, ['encrypt', 'decrypt']),
          catch: (e) =>
            new EncryptionError({
              cause: e,
              message: `AES key generation error: ${String(e)}`,
            }),
        }),
        Effect.map((key): KeyIVTuple => ({ key, iv })),
      ),
    ),
  );

export const encryptDocument = (
  data: Uint8Array<ArrayBuffer>,
  aesKey: CryptoKey,
  iv: Uint8Array<ArrayBuffer>,
) =>
  pipe(
    Effect.tryPromise({
      try: () => crypto.subtle.encrypt({ name: 'AES-CBC', iv: iv.buffer }, aesKey, data.buffer),
      catch: (e) =>
        new EncryptionError({
          cause: e,
          message: `AES encryption error: ${e}`,
        }),
    }),

    Effect.map((cipherBuffer) => {
      return new Uint8Array(cipherBuffer);
    }),
  );

export const exportAesKeyToRawBytes = (
  aesKey: CryptoKey,
): Effect.Effect<Uint8Array<ArrayBuffer>, EncryptionError> =>
  Effect.tryPromise({
    try: () => crypto.subtle.exportKey('raw', aesKey).then((buf) => new Uint8Array(buf)),
    catch: (e) =>
      new EncryptionError({
        cause: e,
        message: `AES key export error: ${e}`,
      }),
  });

export const importAesKeyFromRawBytes = (
  keyBytes: Uint8Array<ArrayBuffer>,
): Effect.Effect<CryptoKey, EncryptionError> =>
  Effect.tryPromise({
    try: () =>
      crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC', length: AES_KEY_LENGTH }, true, [
        'encrypt',
        'decrypt',
      ]),
    catch: (e) =>
      new EncryptionError({
        cause: e,
        message: `AES key import error: ${e}`,
      }),
  });

export const encryptAesKeyWithRsa = (aesKey: CryptoKey, ksefPublicKey: CryptoKey) =>
  pipe(
    Effect.tryPromise({
      try: () => crypto.subtle.exportKey('raw', aesKey),
      catch: (e) =>
        new EncryptionError({
          cause: e,
          message: `AES key export error: ${e}`,
        }),
    }),
    Effect.flatMap((rawAesKey) =>
      Effect.tryPromise({
        try: () => {
          return crypto.subtle.encrypt(RSA_OAEP_ENCRYPT_PARAMS, ksefPublicKey, rawAesKey);
        },
        catch: (e) => {
          return new EncryptionError({
            cause: e,
            message: `RSA-OAEP encryption error: ${e}`,
          });
        },
      }),
    ),
  );
