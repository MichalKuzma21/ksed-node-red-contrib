import * as A from 'effect/Array';
import * as O from 'effect/Option';

const SUCCESS_CODES = [200] as const;
const RETRYABLE_CODES = [100] as const;

export const classifyStatusCode = (code: number) =>
  O.match(
    A.findFirst(SUCCESS_CODES, (c) => c === code),
    {
      onSome: () => 'SUCCESS' as const,
      onNone: () =>
        O.match(
          A.findFirst(RETRYABLE_CODES, (c) => c === code),
          {
            onSome: () => 'RETRYABLE' as const,
            onNone: () => 'FATAL' as const,
          },
        ),
    },
  );
