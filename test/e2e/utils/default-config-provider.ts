import { ConfigProvider } from 'effect/index';

// Default test configuration. Can be overridden by passing a custom ConfigProvider in test setup.
// Uses test KSEF environment with mock credentials for integration testing.
export const defaultTestConfigProvider = ConfigProvider.fromJson({
  BASE_URL: 'https://api-test.ksef.mf.gov.pl',
  DEBUG: 'true',
  VERIFY_CERTIFICATE_CHAIN: 'false',
  SUBJECT_IDENTIFIER_TYPE: 'certificateSubject',
  CONTEXT_IDENTIFIER_TYPE: 'Nip',
  CONTEXT_IDENTIFIER_VALUE: '1234567890',
  AUTH_STATUS_POLLING_MAX_RETRIES: 2,
  AUTH_STATUS_POLLING_INITIAL_INTERVAL: 1000,
  KEY_FILE_PATH: './test/e2e/resources/key.pem',
  CERT_FILE_PATH: './test/e2e/resources/cert.pem',
});
