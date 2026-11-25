import { DEFAULT_PARAMS, parseLaunchUrl } from './launch-params';

describe('parseLaunchUrl', () => {
  it('returns the defaults for anything that is not a scenario link', () => {
    expect(parseLaunchUrl(null)).toEqual(DEFAULT_PARAMS);
    expect(parseLaunchUrl('exp+rtls://expo-development-client/?url=x')).toEqual(DEFAULT_PARAMS);
  });

  it('reads every parameter from a scenario link', () => {
    expect(
      parseLaunchUrl(
        'rtls://scenario?name=trip&friends=500&interval=2000&seed=9&faults=jumps,drops&rung=A&perf=1',
      ),
    ).toEqual({
      scenario: 'trip',
      friends: 500,
      intervalMs: 2000,
      seed: 9,
      faults: ['drops', 'jumps'],
      rung: 'A',
      perf: true,
      fadeMs: 0,
    });
  });

  it('reads every ladder rung', () => {
    expect(
      ['A', 'B', 'C', 'D'].map((r) => parseLaunchUrl(`rtls://scenario?rung=${r}`).rung),
    ).toEqual(['A', 'B', 'C', 'D']);
  });

  it('clamps out-of-range numbers and ignores unknown names, rungs and faults', () => {
    const p = parseLaunchUrl(
      'rtls://scenario?name=rave&friends=999999&interval=1&rung=Z&faults=fire',
    );
    expect(p.scenario).toBe(DEFAULT_PARAMS.scenario);
    expect(p.friends).toBe(5000);
    expect(p.intervalMs).toBe(100);
    expect(p.rung).toBe(DEFAULT_PARAMS.rung);
    expect(p.faults).toEqual([]);
  });
});
