import { Effect } from 'effect/index';
import { AuthApi } from '../api/auth-service';
import { RefreshTokenWorkflowParams, RefreshTokenWorkflowResponse } from '../domain/refresh-token';

export const refreshAccessTokenWorkflow = (params: RefreshTokenWorkflowParams) =>
  Effect.Do.pipe(
    Effect.tap(() => Effect.logInfo('Refreshing access token')),
    Effect.bind('authService', () => AuthApi),
    Effect.bind('rsp', ({ authService }) => authService.refreshToken(params.tokenValue)),
    Effect.tap(() => Effect.logInfo('Access token refreshed successfully')),
    Effect.map(
      ({ rsp }): RefreshTokenWorkflowResponse => ({
        newTokenValue: rsp.accessToken.token,
        newTokenValidUntil: rsp.accessToken.validUntil,
      }),
    ),
  );
