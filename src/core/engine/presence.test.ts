import { Presence } from '../models';
import { budgetFor } from './budget';
import { HEARTBEAT_MS, presenceOf } from './presence';

describe('presenceOf', () => {
  it('keeps a friend standing still Live while heartbeats arrive', () => {
    expect(presenceOf(140_000, 0, HEARTBEAT_MS)).toBe(Presence.Live);
  });

  it('turns a silent friend Recent, then Stale after five minutes', () => {
    expect(presenceOf(160_000, 0, HEARTBEAT_MS)).toBe(Presence.Recent);
    expect(presenceOf(5 * 60_000 + 1, 0, HEARTBEAT_MS)).toBe(Presence.Stale);
  });

  it('does not flicker a walker to Recent over one or two lost fixes', () => {
    expect(presenceOf(3500, 0, 1000)).toBe(Presence.Live);
    expect(presenceOf(11_000, 0, 1000)).toBe(Presence.Recent);
  });

  it('treats a friend never heard from as Stale', () => {
    expect(presenceOf(1000, NaN, 1000)).toBe(Presence.Stale);
  });
});

describe('budgetFor', () => {
  const power = {
    lowPowerMode: false,
    thermal: 'nominal' as const,
    battery: 1,
    reduceMotion: false,
  };

  it('gives the full animation budget on a cool phone', () => {
    expect(budgetFor(power)).toEqual({ glideLimit: 30, glideFps: 60, gestureUpdatesPerSec: 4 });
  });

  it('cuts gliding under Low Power Mode and when the phone heats up', () => {
    expect(budgetFor({ ...power, lowPowerMode: true }).glideLimit).toBe(10);
    expect(budgetFor({ ...power, thermal: 'serious' }).glideFps).toBe(15);
  });

  it('stops all gliding when the phone is critically hot, even in Low Power Mode', () => {
    expect(budgetFor({ ...power, lowPowerMode: true, thermal: 'critical' })).toEqual({
      glideLimit: 0,
      glideFps: 0,
      gestureUpdatesPerSec: 1,
    });
  });
});
