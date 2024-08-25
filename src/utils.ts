export interface RangeOptions {
  start: number;
  end: number;
  step: number;
}

export function* infinityRange(options: Partial<RangeOptions>): Generator<number, void, unknown> {
  for(;;) {
    yield* range(options);
  }
}

export function* range(options?: Partial<RangeOptions>): Generator<number, void, unknown> {
  const { start, end, step }: RangeOptions = {
    start: 0,
    end: Number.MAX_SAFE_INTEGER,
    step: 1,
    ...options,
  };
  for (let i = start; i < end; i += step) {
    yield i;
  }
}

export function throwIfNaInt(str: string, radix?: number): number {
  const n = parseInt(str, radix);
  if (isNaN(n)) {
    throw new Error(`Expect '${str}' to be a int`);
  }
  return n;
}
