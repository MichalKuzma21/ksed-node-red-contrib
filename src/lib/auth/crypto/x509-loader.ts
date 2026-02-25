import { Effect, Option } from 'effect/index';
import * as fs from 'fs';
import * as crypto from 'crypto';
import {
  CertificateParseError,
  InsecureFilePermissions,
  KeyParseError,
  PrivateKeyReadError,
  UnsupportedEncryptedKey,
} from './errors';

const checkKeyFilePermission = (filePath: string) => {
  return Effect.try({
    try: () => {
      fs.accessSync(filePath, fs.constants.R_OK);
      const stats = fs.statSync(filePath);
      const mode = stats.mode & 0o777;
      if (mode & 0o077) {
        throw new InsecureFilePermissions({ path: filePath, mode });
      }
    },
    catch: (err) =>
      err instanceof InsecureFilePermissions
        ? err
        : new PrivateKeyReadError({ path: filePath, cause: err }),
  });
};

export const loadCert = (filePath: string) => {
  return Effect.try({
    try: () => {
      return fs.readFileSync(filePath, 'utf-8');
    },
    catch: (err) => new PrivateKeyReadError({ path: filePath, cause: err }),
  });
};

export const convertCertToDer = (data: string) => {
  return Effect.try({
    try: () => {
      const cert = new crypto.X509Certificate(data);
      const derBuffer = cert.raw;
      return derBuffer.toString('base64');
    },
    catch: (err) => {
      return new CertificateParseError({ cause: err });
    },
  });
};

export const convertKeyToPKCS8Der = (data: string, passphrase: Option.Option<string>) => {
  return Effect.try({
    try: () => {
      if (data.includes('ENCRYPTED PRIVATE KEY')) {
        if (Option.isNone(passphrase)) {
          throw new UnsupportedEncryptedKey({ message: 'No password provided for encrypted key' });
        }
      }

      const keyOptions: crypto.PrivateKeyInput = {
        key: data,
        format: 'pem',
      };

      if (Option.isSome(passphrase)) {
        keyOptions.passphrase = passphrase.value;
      }

      const privateKey = crypto.createPrivateKey(keyOptions);

      const pkcs8DerKey = privateKey.export({
        format: 'der',
        type: 'pkcs8',
        passphrase: undefined,
      });

      return pkcs8DerKey;
    },
    catch: (err) => {
      if (err instanceof UnsupportedEncryptedKey) {
        return err;
      }
      return new KeyParseError({ cause: err });
    },
  });
};

export const loadKey = (filePath: string) => {
  return Effect.flatMap(checkKeyFilePermission(filePath), () => {
    return Effect.try({
      try: () => {
        return fs.readFileSync(filePath, 'utf-8');
      },
      catch: (err) => new PrivateKeyReadError({ path: filePath, cause: err }),
    });
  });
};
