import { DEFAULT_PARAMS, parseLaunchUrl } from './launch-params';

describe('parseLaunchUrl', () => {
  it('returns the defaults for anything that is not a scenario link', () => {
    expect(parseLaunchUrl(null)).toEqual(DEFAULT_PARAMS);
    expect(parseLaunchUrl('exp+rtls://expo-development-client/?url=x')).toEqual(DEFAULT_PARAMS);
  });

  it('reads every parameter from a scenario link', () => {
    expect(
      parseLaunchUrl('rtls://scenario?name=concert&friends=500&interval=2000&seed=9&rung=A&perf=1'),
    ).toEqual({
      scenario: 'concert',
      friends: 500,
      intervalMs: 2000,
      seed: 9,
      rung: 'A',
      perf: true,
    });
  });

  it('clamps out-of-range numbers and ignores unknown rungs', () => {
    const p = parseLaunchUrl('rtls://scenario?friends=999999&interval=1&rung=Z');
    expect(p.friends).toBe(5000);
    expect(p.intervalMs).toBe(100);
    expect(p.rung).toBe(DEFAULT_PARAMS.rung);
  });
});
