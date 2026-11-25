import { movementOf, sharingDecision, type SharingState } from './policy';

const at = (speedMs: number, more: Partial<SharingState> = {}): SharingState => ({
  speedMs,
  watched: true,
  battery: 1,
  lowPowerMode: false,
  ...more,
});

describe('sharingDecision', () => {
  it('classes movement by GPS speed alone', () => {
    expect([0, 1, 4, 15].map(movementOf)).toEqual(['still', 'walk', 'run', 'drive']);
  });

  it('sends a walker’s every fix within 5 s while someone is watching', () => {
    const d = sharingDecision(at(1.4));
    expect(d).toMatchObject({ gps: 'high', sends: 'each-fix' });
    expect(d.sendIntervalMs).toBeLessThanOrEqual(5_000);
  });

  it('uses balanced GPS and a 25 m filter when driving', () => {
    expect(sharingDecision(at(20))).toMatchObject({ gps: 'balanced', minDistanceM: 25 });
  });

  it('only sends a heartbeat a minute for a friend standing still', () => {
    expect(sharingDecision(at(0))).toMatchObject({
      gps: 'low',
      sends: 'heartbeat',
      sendIntervalMs: 60_000,
    });
  });

  it('batches once a minute when nobody is watching', () => {
    expect(sharingDecision(at(1.4, { watched: false }))).toMatchObject({
      sends: 'batch',
      sendIntervalMs: 60_000,
    });
    expect(sharingDecision(at(0, { watched: false })).sendIntervalMs).toBe(120_000);
  });

  it('drops one GPS level on low battery or in Low Power Mode', () => {
    expect(sharingDecision(at(1.4, { battery: 0.15 })).gps).toBe('balanced');
    expect(sharingDecision(at(20, { lowPowerMode: true })).gps).toBe('low');
  });

  it('keeps sending live updates on low battery while someone is watching', () => {
    expect(sharingDecision(at(1.4, { battery: 0.1 })).sendIntervalMs).toBeLessThanOrEqual(5_000);
  });
});
