import { ManagersProvider } from '@common/di';
import { createTestManagers } from '@testing/fakes';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Share } from 'react-native';

import { useSessions } from './useSessions';

const mockNavigation = { navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));

async function setup() {
  const managers = createTestManagers();
  await managers.sessions.load();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ManagersProvider value={managers}>{children}</ManagersProvider>
  );
  return { managers, ...(await renderHook(() => useSessions(), { wrapper })) };
}

describe('useSessions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows each session with its kind, size and a few faces', async () => {
    const { result } = await setup();
    expect(result.current.cards.map((c) => c.title)).toEqual([
      'Road trip with family',
      'Marathon running club',
      'Sunday marathon',
      'Concert night',
    ]);
    expect(result.current.cards[1]).toMatchObject({ detail: 'Marathon · 150 people', more: 145 });
    expect(result.current.cards[2]).toMatchObject({
      icon: '🏃',
      detail: 'Marathon · 6 people',
      more: 1,
    });
    expect(result.current.cards[2]?.avatars.map((a) => a.initials)).toEqual(['A', 'K', 'M', 'D']);
  });

  it('opens a session’s map and starts a new one by route name', async () => {
    const { result } = await setup();
    const id = result.current.cards[0]?.id ?? '';
    await act(() => result.current.open(id));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('SessionMap', { id });
    await act(() => result.current.create());
    expect(mockNavigation.navigate).toHaveBeenCalledWith('NewSession');
  });

  it('leaves a session: it disappears from the list', async () => {
    const { result } = await setup();
    const id = result.current.cards[0]?.id ?? '';
    await act(() => result.current.leave(id));
    expect(result.current.cards.map((c) => c.id)).not.toContain(id);
  });

  it('shares an invite with your name in it', async () => {
    const { managers, result } = await setup();
    managers.sessions.updateProfile({ name: 'Asha' });
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await act(() => result.current.invite(result.current.cards[0]?.id ?? ''));
    expect(share.mock.calls[0]?.[0].message).toMatch(
      /^Asha invited you to “Road trip with family”.*\nrtls:\/\/join\/[A-Z2-9]{6}\?e=trip/s,
    );
  });

  it('offers invites only for sessions a link can carry', async () => {
    const { result } = await setup();
    expect(result.current.cards.map((c) => c.canInvite)).toEqual([true, false, true, true]);
  });

  it('greets you by first name, and opens your profile from your avatar', async () => {
    const { managers, result } = await setup();
    expect(result.current.greeting).toBe('Your sessions');
    await act(() => managers.sessions.updateProfile({ name: 'Asha Rao' }));
    expect(result.current.greeting).toBe('Hi, Asha');
    await act(() => result.current.openProfile());
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Profile');
  });
});
