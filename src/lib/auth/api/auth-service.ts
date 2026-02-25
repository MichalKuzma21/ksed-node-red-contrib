import { Context, Effect, Layer } from 'effect';
import {
  AuthenticationChallengeResponse,
  AuthenticationInitResponse,
  AuthenticationOperationStatusResponse,
  AuthenticationTokenRefreshResponse,
  AuthenticationTokensResponse,
  ReferenceNumber,
  TokenInfo,
} from '../../../hey-api-generated-ksef-client';
import { getAuthStatus } from './auth-status';
import { getChallenge } from './challenge';
import { redeemAccessToken } from './redeem-access-token';
import { refreshToken } from './refresh-token';
import { sendSignedXml } from './send-signed-token';
import { ApiClient } from '../../common/api-client';
import { KsefApiError } from '../../common/errors';

export class AuthApi extends Context.Tag('AuthApi')<
  AuthApi,
  {
    readonly getChallenge: Effect.Effect<AuthenticationChallengeResponse, KsefApiError, ApiClient>;
    readonly sendSignedXml: (
      signedXml: string,
      verifyCertificateChain: boolean,
    ) => Effect.Effect<AuthenticationInitResponse, KsefApiError, ApiClient>;
    readonly getAuthStatus: (
      ref: ReferenceNumber,
      token: TokenInfo,
    ) => Effect.Effect<AuthenticationOperationStatusResponse, KsefApiError, ApiClient>;
    readonly redeemAccessToken: (
      authToken: string,
    ) => Effect.Effect<AuthenticationTokensResponse, KsefApiError, ApiClient>;
    readonly refreshToken: (
      token: string,
    ) => Effect.Effect<AuthenticationTokenRefreshResponse, KsefApiError, ApiClient>;
  }
>() {}

export const authApiLive = Layer.succeed(AuthApi, {
  getChallenge,
  sendSignedXml,
  getAuthStatus,
  redeemAccessToken,
  refreshToken,
});
