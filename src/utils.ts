export interface RangeOptions {
  start: number;
  end: number;
  step: number;
}

export function* range(options?: Partial<RangeOptions>) {
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
