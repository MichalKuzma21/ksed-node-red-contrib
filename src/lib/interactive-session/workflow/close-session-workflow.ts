import { Effect } from 'effect/index';
import { InteractiveSessionApi } from '../api/interactive-session-service';
import { CloseSessionWorkflowParams, CloseSessionWorkflowResponse } from '../domain/close-session';

export const closeSessionWorkflow = (params: CloseSessionWorkflowParams) =>
  Effect.Do.pipe(
    Effect.tap(() =>
      Effect.logInfo('Closing KSeF interactive session', {
        referenceNumber: params.referenceNumber,
      }),
    ),
    Effect.bind('sessionService', () => InteractiveSessionApi),
    Effect.bind('rsp', ({ sessionService }) =>
      sessionService.closeSession(params.accessToken, params.referenceNumber),
    ),
    Effect.tap(() =>
      Effect.logInfo('Interactive session closed', { referenceNumber: params.referenceNumber }),
    ),
    Effect.map((): CloseSessionWorkflowResponse => {
      return {
        referenceNumber: params.referenceNumber,
      };
    }),
  );
