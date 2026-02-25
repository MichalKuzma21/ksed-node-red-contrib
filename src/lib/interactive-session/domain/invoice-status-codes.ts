import * as A from 'effect/Array';
import * as O from 'effect/Option';

export const SUCCESS_CODES = [200] as const;
export const RETRYABLE_CODES = [100, 150] as const;

export type StatusCategory = 'SUCCESS' | 'RETRYABLE' | 'FATAL';

export const classifyStatusCode = (code: number): StatusCategory =>
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
