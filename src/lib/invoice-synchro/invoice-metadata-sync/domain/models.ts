import { Data } from 'effect/index';
import { InvoiceMetadata } from '../../../../hey-api-generated-ksef-client';

export class InvoiceWithHwm extends Data.TaggedClass('InvoiceWithHwm')<{
  readonly invoice: InvoiceMetadata;
  readonly permanentStorageHwmDate: string;
}> {}

export class HwmOnly extends Data.TaggedClass('HwmOnly')<{
  readonly permanentStorageHwmDate: string;
}> {}

export type StreamElement = InvoiceWithHwm | HwmOnly;
