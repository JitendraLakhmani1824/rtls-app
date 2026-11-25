import { Presence } from '@core/models';

import {
  formatAgo,
  formatDirection,
  formatDistance,
  formatMovement,
  presenceLabel,
} from './format';

describe('format', () => {
  it('writes distances people can read at a glance', () => {
    expect([4, 43, 350, 1234, 15_400, NaN].map(formatDistance)).toEqual([
      '4 m',
      '40 m',
      '350 m',
      '1.2 km',
      '15 km',
      '—',
    ]);
  });

  it('turns bearings into compass points', () => {
    expect([0, 44, 90, 200, 350, NaN].map(formatDirection)).toEqual(['N', 'NE', 'E', 'S', 'N', '']);
  });

  it('says how long ago in the largest sensible unit', () => {
    expect([2_000, 40_000, 190_000, 7_300_000, NaN].map(formatAgo)).toEqual([
      'just now',
      '40 s ago',
      '3 min ago',
      '2 h ago',
      'never',
    ]);
  });

  it('names presence in words, not only colour', () => {
    expect(
      [Presence.Live, Presence.Recent, Presence.Stale, Presence.Paused].map(presenceLabel),
    ).toEqual(['Live', 'Recently', 'Last seen', 'Paused sharing']);
  });

  it('names movement from speed', () => {
    expect([0, 1.2, 4, 20].map(formatMovement)).toEqual(['', 'walking', 'running', 'driving']);
  });
});
