export interface Rng {
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  pickMany<T>(items: readonly T[], count: number): T[];
}

export function createRng(seed = 42): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  return {
    next,
    int(minInclusive, maxInclusive) {
      const r = next();
      return Math.floor(r * (maxInclusive - minInclusive + 1)) + minInclusive;
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    pickMany<T>(items: readonly T[], count: number): T[] {
      const copy = [...items];
      const result: T[] = [];
      while (copy.length > 0 && result.length < count) {
        const idx = Math.floor(next() * copy.length);
        result.push(copy.splice(idx, 1)[0]!);
      }
      return result;
    },
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function id(prefix: string, n: number): string {
  return `${prefix}_${n.toString(36)}`;
}
