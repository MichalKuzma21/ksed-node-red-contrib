import { Effect } from 'effect';
import {
  EncryptionInfo,
  FormCode,
  postApiV2SessionsOnline,
} from '../../../hey-api-generated-ksef-client';
import { ApiClient } from '../../common/api-client';
import { NetworkError } from '../../common/errors';
import { unwrapApiResponse } from '../../common/unwrap-api-response';

export const openSession = (
  authToken: string,
  formCode: FormCode,
  encryptionInfo: EncryptionInfo,
) =>
  ApiClient.pipe(
    Effect.flatMap((client) =>
      Effect.tryPromise({
        try: () =>
          postApiV2SessionsOnline({
            client,
            body: {
              formCode: formCode,
              encryption: encryptionInfo,
            },
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }),
        catch: (cause) => new NetworkError({ cause: cause }),
      }),
    ),
    Effect.flatMap(unwrapApiResponse('postApiV2SessionsOnline')),
  );
