/**
 * Fisher-Yates shuffle: returns a new randomly shuffled copy of the array.
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * splitmix32 finalizer: decorrelates small consecutive integer seeds before
 * they feed xorshift32. Without this, seeds like day-index 20608 / 20609 / 20610
 * land on the same permutation for short arrays, making "daily rotation" invisible.
 */
function mixSeed(z: number): number {
  z = (z + 0x9e3779b9) | 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return (z ^ (z >>> 16)) >>> 0;
}

/**
 * Deterministic Fisher-Yates shuffle using a seeded xorshift32 PRNG.
 * Produces the same order for the same seed on both server and client,
 * preventing hydration mismatches when the initial shuffle must be stable.
 */
export function shuffleSeeded<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  // splitmix32 is a bijection on 32-bit ints, so exactly one input maps to 0.
  // Guard against that one input since xorshift32 locks at the all-zero state.
  let s = mixSeed(seed || 1) || 1;
  const rand = () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 0x100000000;
  };
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
