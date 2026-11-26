import { ME_KEY, type SessionRecord } from '@core/models';

import { invitePartsOf, inviteUrl, parseInvite } from './invite';

const record: SessionRecord = {
  id: 'K7Q2XP',
  title: 'City Marathon & friends',
  event: 'marathon',
  people: [
    { key: 'riya', name: 'Riya' },
    { key: ME_KEY, name: '' },
    { key: 'dev', name: 'Dev Patel' },
  ],
  createdAt: 0,
};

describe('invite links', () => {
  it('carries the code, event, title, everyone in order and who sent it', () => {
    const url = inviteUrl(record, 'Asha');
    expect(url).toBe(
      'rtls://join/K7Q2XP?e=marathon&t=City%20Marathon%20%26%20friends&p=Riya,Asha,Dev%20Patel&f=1',
    );
    expect(parseInvite(invitePartsOf(url) ?? {})).toEqual({
      code: 'K7Q2XP',
      event: 'marathon',
      title: 'City Marathon & friends',
      names: ['Riya', 'Asha', 'Dev Patel'],
      from: 1,
    });
  });

  it('names the sender "A friend" until they set their name', () => {
    expect(inviteUrl(record, '')).toContain('p=Riya,A%20friend,Dev%20Patel');
  });

  it.each([
    ['a bad code', { code: 'K7Q2X0', e: 'trip', p: 'A,B', f: '0' }],
    ['an unknown event', { code: 'K7Q2XP', e: 'party', p: 'A,B', f: '0' }],
    ['nobody to join', { code: 'K7Q2XP', e: 'trip', p: 'A', f: '0' }],
    ['a blank name', { code: 'K7Q2XP', e: 'trip', p: 'A,,B', f: '0' }],
    ['too many people', { code: 'K7Q2XP', e: 'trip', p: Array(22).fill('A').join(','), f: '0' }],
    ['a sender outside the list', { code: 'K7Q2XP', e: 'trip', p: 'A,B', f: '2' }],
  ])('rejects a link with %s', (_, parts) => {
    expect(parseInvite(parts)).toBeNull();
  });

  it('accepts a lower-case code and gives an untitled session a title', () => {
    expect(parseInvite({ code: 'k7q2xp', e: 'trip', p: 'A,B' })).toMatchObject({
      code: 'K7Q2XP',
      title: 'Shared session',
      from: 0,
    });
  });

  it('is not fooled by other links', () => {
    expect(invitePartsOf('rtls://scenario?name=trip')).toBeNull();
  });
});
