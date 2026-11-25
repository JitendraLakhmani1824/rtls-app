import { FIX_STRIDE, type FixBatch } from '@core/models';
import type { FeedManager } from '@core/protocols';
import { createRng, offsetMeters } from '@core/utils';

export type Fault = 'drops' | 'dups' | 'reorder' | 'jumps';
export const FAULTS: readonly Fault[] = ['drops', 'dups', 'reorder', 'jumps'];

const DROP_SHARE = 0.1;
const DUP_SHARE = 0.05;
const REORDER_SHARE = 0.05;
const JUMP_SHARE = 0.02;
const JUMP_M = 300;

/**
 * Wraps a feed to behave like a bad network and bad GPS, deterministically (seeded):
 * - drops: 10% of fixes never arrive
 * - dups: 5% arrive twice (same batch and the next one)
 * - reorder: 5% arrive one batch late, after newer fixes
 * - jumps: 2% are thrown 300 m off (multipath), the next fix is correct again
 * The engine must show none of this: no backwards motion, no phantom jumps.
 */
export function withFaults(feed: FeedManager, faults: readonly Fault[], seed: number): FeedManager {
  if (faults.length === 0) return feed;
  const on = new Set(faults);
  const rng = createRng(seed ^ 0x5eed);
  return {
    start(sink, resume) {
      let carry: number[] = []; // fixes held over to the next batch (late or duplicated)
      const out: FixBatch = { n: 0, buf: new Float64Array(0) };
      const push = (fix: ArrayLike<number>) => {
        if ((out.n + 1) * FIX_STRIDE > out.buf.length) {
          const bigger = new Float64Array(Math.max(64, out.buf.length * 2));
          bigger.set(out.buf);
          out.buf = bigger;
        }
        out.buf.set(fix as ArrayLike<number>, out.n * FIX_STRIDE);
        out.n++;
      };
      return feed.start(
        {
          ...sink,
          onFixes(batch) {
            out.n = 0;
            const held = carry;
            carry = [];
            for (let i = 0; i < batch.n; i++) {
              const fix = Array.from(batch.buf.subarray(i * FIX_STRIDE, (i + 1) * FIX_STRIDE));
              if (on.has('drops') && rng.next() < DROP_SHARE) continue;
              if (on.has('reorder') && rng.next() < REORDER_SHARE) {
                carry.push(...fix);
                continue;
              }
              if (on.has('jumps') && rng.next() < JUMP_SHARE) {
                const [lng, lat] = offsetMeters(fix[2] ?? 0, fix[3] ?? 0, JUMP_M, JUMP_M);
                fix[2] = lng;
                fix[3] = lat;
              }
              push(fix);
              if (on.has('dups') && rng.next() < DUP_SHARE) carry.push(...fix);
            }
            for (let o = 0; o < held.length; o += FIX_STRIDE) push(held.slice(o, o + FIX_STRIDE));
            if (out.n > 0) sink.onFixes(out);
          },
        },
        resume,
      );
    },
  };
}
