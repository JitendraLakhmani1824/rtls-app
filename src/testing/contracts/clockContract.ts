import type { Clock } from '@core/protocols';

/** A clock under test, plus a way to move its time forward. */
export type ClockUnderTest = { clock: Clock; advance(ms: number): void };

/** The promises every Clock keeps. Run it for each implementation: `clockContract('FakeClock', make)`. */
export function clockContract(name: string, make: () => ClockUnderTest) {
  describe(`${name} keeps the Clock contract`, () => {
    it('moves now() forward with time', () => {
      const { clock, advance } = make();
      const before = clock.now();
      advance(1500);
      expect(clock.now()).toBe(before + 1500);
    });

    it('calls every() once per period until stopped', () => {
      const { clock, advance } = make();
      let calls = 0;
      const stop = clock.every(100, () => calls++);
      advance(350);
      expect(calls).toBe(3);
      stop();
      advance(1000);
      expect(calls).toBe(3);
    });

    it('calls after() once, and never if stopped first', () => {
      const { clock, advance } = make();
      let fired = 0;
      let cancelled = 0;
      clock.after(100, () => fired++);
      const stop = clock.after(100, () => cancelled++);
      stop();
      advance(1000);
      expect(fired).toBe(1);
      expect(cancelled).toBe(0);
    });

    it('fires timers in time order, seeing the time they were due', () => {
      const { clock, advance } = make();
      const start = clock.now();
      const seen: string[] = [];
      clock.after(300, () => seen.push(`b@${clock.now() - start}`));
      clock.after(100, () => seen.push(`a@${clock.now() - start}`));
      advance(500);
      expect(seen).toEqual(['a@100', 'b@300']);
    });
  });
}
