import { Data } from 'effect';

export class HighWaterMark extends Data.Class<{ readonly value: Date }> {
  static fromDate(date: Date): HighWaterMark {
    return new HighWaterMark({ value: date });
  }

  static fromISOString(dateStr: string): HighWaterMark {
    return new HighWaterMark({ value: new Date(dateStr) });
  }

  increment(): HighWaterMark {
    return new HighWaterMark({ value: new Date(this.value.getTime() + 1) });
  }

  isAfter(other: HighWaterMark): boolean {
    return this.value > other.value;
  }

  toDate(): Date {
    return this.value;
  }

  toISOString(): string {
    return this.value.toISOString();
  }
}
