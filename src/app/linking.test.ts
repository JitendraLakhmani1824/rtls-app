import { getStateFromPath } from '@react-navigation/native';

import { linking } from './linking';

const stateOf = (path: string) => getStateFromPath(path, linking.config);

describe('deep links', () => {
  it('opens an invite link on Join, above the tabs, with the link’s parts decoded', () => {
    const state = stateOf('join/K7Q2XP?e=marathon&t=City%20Marathon&p=Asha,Riya%20S&f=0');
    expect(state?.routes.map((r) => r.name)).toEqual(['Tabs', 'Join']);
    expect(state?.routes[1]?.params).toEqual({
      code: 'K7Q2XP',
      e: 'marathon',
      t: 'City Marathon',
      p: 'Asha,Riya S',
      f: '0',
    });
  });

  it('opens a session link on that session’s map', () => {
    const state = stateOf('session/K7Q2XP');
    expect(state?.routes.map((r) => r.name)).toEqual(['Tabs', 'SessionMap']);
    expect(state?.routes[1]?.params).toEqual({ id: 'K7Q2XP' });
  });

  it('leaves scenario links to Root', () => {
    expect(linking.filter?.('rtls://scenario?name=trip')).toBe(false);
    expect(linking.filter?.('rtls://join/K7Q2XP?e=trip&p=A,B')).toBe(true);
  });
});
