// A small seeded random generator (mulberry32), so the demo data is the same
// on every build and the page can stay static.
export function seeded(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Normal-ish noise around 1, spread ±`spread`. */
    jitter(spread: number) {
      return 1 + (next() + next() + next() - 1.5) * (spread / 1.5);
    },
    /** How many of `n` trials succeed with probability `p`. */
    binomial(n: number, p: number) {
      let hits = 0;
      for (let i = 0; i < n; i++) if (next() < p) hits++;
      return hits;
    },
    int(min: number, max: number) {
      return min + Math.floor(next() * (max - min + 1));
    },
  };
}
