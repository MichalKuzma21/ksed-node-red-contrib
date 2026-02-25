import { Effect } from 'effect';
import { postApiV2AuthXadesSignature } from '../../../hey-api-generated-ksef-client';
import { NetworkError } from '../../common/errors';
import { ApiClient } from '../../common/api-client';
import { unwrapApiResponse } from '../../common/unwrap-api-response';

export const sendSignedXml = (signedXml: string, verifyCertificateChain: boolean) =>
  ApiClient.pipe(
    Effect.flatMap((client) =>
      Effect.tryPromise({
        try: () => {
          return postApiV2AuthXadesSignature({
            client,
            body: signedXml,
            query: { verifyCertificateChain: verifyCertificateChain },
            bodySerializer: null,
          });
        },
        catch: (cause) =>
          new NetworkError({
            cause: cause,
          }),
      }),
    ),
    Effect.flatMap(unwrapApiResponse('postApiV2AuthXadesSignature')),
  );
