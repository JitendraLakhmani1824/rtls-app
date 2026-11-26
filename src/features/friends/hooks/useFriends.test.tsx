import { ManagersProvider } from '@common/di';
import { createTestManagers } from '@testing/fakes';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useFriends } from './useFriends';

const mockNavigation = { navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));

async function setup() {
  const managers = createTestManagers();
  await managers.sessions.load();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ManagersProvider value={managers}>{children}</ManagersProvider>
  );
  return { managers, ...(await renderHook(() => useFriends(), { wrapper })) };
}

describe('useFriends', () => {
  it('lists family, then friends, by name, with how many sessions you share', async () => {
    const { result } = await setup();
    expect(result.current.sections.map((s) => s.title)).toEqual(['Family', 'Friends']);
    expect(result.current.sections[0]?.data.map((p) => p.name)).toEqual([
      'Dad',
      'Didi',
      'Mom',
      'Nani',
      'Rohan',
    ]);
    const nani = result.current.sections[0]?.data.find((p) => p.name === 'Nani');
    const mom = result.current.sections[0]?.data.find((p) => p.name === 'Mom');
    expect(nani?.detail).toBe('Not in a session yet');
    expect(mom?.detail).toBe('In 1 session');
  });

  it('adds a person to the circle you pick', async () => {
    const { result } = await setup();
    await act(() => result.current.startAdding());
    await act(() => result.current.setNewName('  Sam '));
    await act(() => result.current.setNewCircle('family'));
    await act(() => result.current.add());
    expect(result.current.adding).toBe(false);
    expect(result.current.sections[0]?.data.map((p) => p.name)).toContain('Sam');
  });

  it('shows you at the top, with your photo, and opens your profile', async () => {
    const { managers, result } = await setup();
    await act(() => managers.sessions.updateProfile({ name: 'Asha', photo: 'file:///me.jpg' }));
    expect(result.current.me).toEqual({ name: 'Asha', initials: 'A', photo: 'file:///me.jpg' });
    await act(() => result.current.openProfile());
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Profile');
  });

  it('opens a person’s page by route name', async () => {
    const { result } = await setup();
    await act(() => result.current.open('riya'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Person', { key: 'riya' });
  });
});
