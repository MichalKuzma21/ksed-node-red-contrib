import { Effect, Config, Schedule, Duration, Match } from 'effect';
import { AuthApi } from '../api/auth-service';
import { AuthTokenRequestBuilder } from '../domain/auth-token-request';
import {
  appendFixedSignature,
  importPrivateKey,
  parseXMLString,
  serializeXmlDocument,
  signXMLDocument,
} from '../crypto/xml-signing';
import {
  AuthStatusApiError,
  AuthStatusPollingFatalError,
  AuthStatusPollingRetryableError,
} from '../api/errors';
import { classifyStatusCode } from '../domain/auth-status-retry-codes';
import { AuthenticateWorkflowParams, AuthenticateWorkflowResponse } from '../domain/authenticate';

const retryPolicy = (maxRetries: number, initialInterval: number) =>
  Schedule.intersect(
    Schedule.recurWhile(
      (error: unknown) => (error as AuthStatusApiError)?._tag === 'AuthStatusPollingRetryableError',
    ),
    Schedule.intersect(
      Schedule.recurs(maxRetries),
      Schedule.exponential(Duration.millis(initialInterval)),
    ),
  );

export const authenticateWorkflow = (params: AuthenticateWorkflowParams) =>
  Effect.Do.pipe(
    Effect.tap(() => Effect.logInfo('Starting KSeF authentication')),
    Effect.bind('authService', () => AuthApi),
    Effect.bind('challenge', ({ authService }) => authService.getChallenge),
    Effect.tap(({ challenge }) =>
      Effect.logDebug('Challenge received', { challenge: challenge.challenge }),
    ),
    Effect.bind('config', () =>
      Effect.all({
        subjectIdentifierType: Config.literal(
          'certificateSubject',
          'certificateFingerprint',
        )('SUBJECT_IDENTIFIER_TYPE'),
        contextIdentifierValue: Config.string('CONTEXT_IDENTIFIER_VALUE'),
        contextIdentifierType: Config.string('CONTEXT_IDENTIFIER_TYPE'),
        authStatusPollingMaxRetries: Config.number('AUTH_STATUS_POLLING_MAX_RETRIES'),
        authStatusPollingInitialInterval: Config.number('AUTH_STATUS_POLLING_INITIAL_INTERVAL'),
        verifyCertificateChain: Config.boolean('VERIFY_CERTIFICATE_CHAIN'),
      }),
    ),
    Effect.bind('authRequest', ({ challenge, config }) =>
      Effect.sync(() =>
        new AuthTokenRequestBuilder()
          .setChallenge(challenge.challenge)
          .setNamespace('http://ksef.mf.gov.pl/auth/token/2.0')
          .setSubjectIdentifierType(config.subjectIdentifierType)
          .setContextIdentifier({
            Value: config.contextIdentifierValue,
            Type: config.contextIdentifierType,
          })
          .build(),
      ),
    ),
    Effect.tap(() => Effect.logDebug('Auth token request built, signing XML')),
    Effect.bind('xmlDocument', ({ authRequest }) => parseXMLString(authRequest)),
    Effect.bind('privateKey', () => importPrivateKey(params.pemKey, 'pkcs8', params.algo)),
    Effect.bind('signedDocument', ({ privateKey, xmlDocument }) =>
      signXMLDocument(params.algo)(privateKey)(xmlDocument)(params.x509cert),
    ),
    Effect.bind('signedWithFixedSignature', ({ signedDocument }) =>
      appendFixedSignature(signedDocument),
    ),
    Effect.bind('serializedXml', ({ signedWithFixedSignature }) =>
      serializeXmlDocument(signedWithFixedSignature),
    ),
    Effect.tap(() => Effect.logDebug('XML signed, sending to KSeF')),
    Effect.bind('response', ({ serializedXml, config, authService }) =>
      authService.sendSignedXml(serializedXml, config.verifyCertificateChain),
    ),
    Effect.tap(({ response }) =>
      Effect.logInfo('Signed token sent, polling auth status', {
        referenceNumber: response.referenceNumber,
      }),
    ),
    Effect.bind('statusRsp', ({ response, config, authService }) =>
      Effect.suspend(() =>
        authService.getAuthStatus(response.referenceNumber, response.authenticationToken),
      ).pipe(
        Effect.flatMap((rsp) => {
          const code = rsp.status.code;
          const category = classifyStatusCode(code);
          return Match.value(category).pipe(
            Match.when('SUCCESS', () => Effect.succeed(rsp)),
            Match.when('RETRYABLE', () =>
              Effect.fail<AuthStatusApiError>(
                new AuthStatusPollingRetryableError({
                  code: code,
                  description: rsp.status.description,
                  details: rsp.status.details ?? [],
                }),
              ),
            ),
            Match.orElse(() =>
              Effect.fail<AuthStatusApiError>(
                new AuthStatusPollingFatalError({
                  code: code,
                  description: rsp.status.description,
                  details: rsp.status.details ?? [],
                }),
              ),
            ),
          );
        }),
        Effect.retry(
          retryPolicy(config.authStatusPollingMaxRetries, config.authStatusPollingInitialInterval),
        ),
      ),
    ),
    Effect.tap(({ statusRsp }) =>
      Effect.logDebug('Auth status confirmed', { code: statusRsp.status.code }),
    ),
    Effect.bind('redeemAccessTokenRsp', ({ response, authService }) =>
      authService.redeemAccessToken(response.authenticationToken.token),
    ),
    Effect.tap(() => Effect.logInfo('Authentication successful, access token redeemed')),
    Effect.map(({ redeemAccessTokenRsp }): AuthenticateWorkflowResponse => {
      return {
        accessToken: redeemAccessTokenRsp.accessToken.token,
        accessTokenValidUntil: redeemAccessTokenRsp.accessToken.validUntil,
        refreshToken: redeemAccessTokenRsp.refreshToken.token,
        refreshTokenValidUntil: redeemAccessTokenRsp.refreshToken.validUntil,
      };
    }),
  );
