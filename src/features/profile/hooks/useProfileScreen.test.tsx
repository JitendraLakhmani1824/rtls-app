import { ManagersProvider } from '@common/di';
import { createTestManagers } from '@testing/fakes';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useProfileScreen } from './useProfileScreen';

const mockNavigation = { goBack: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));

async function setup() {
  const managers = createTestManagers();
  await managers.sessions.load();
  managers.sessions.updateProfile({ name: 'Asha', photo: 'file:///old.jpg', onboarded: true });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ManagersProvider value={managers}>{children}</ManagersProvider>
  );
  return { managers, ...(await renderHook(() => useProfileScreen(), { wrapper })) };
}

describe('useProfileScreen', () => {
  it('saves a new name only when you save, and only if it changed', async () => {
    const { managers, result } = await setup();
    await act(() => result.current.setName('Asha Rao'));
    expect(result.current.changed).toBe(true);
    expect(managers.sessions.profile.get().name).toBe('Asha');
    await act(() => result.current.save());
    expect(managers.sessions.profile.get().name).toBe('Asha Rao');
    expect(result.current.changed).toBe(false);
  });

  it('never saves an empty name', async () => {
    const { managers, result } = await setup();
    await act(() => result.current.setName('   '));
    expect(result.current.changed).toBe(false);
    await act(() => result.current.save());
    expect(managers.sessions.profile.get().name).toBe('Asha');
  });

  it('changes the photo at once and deletes the old file', async () => {
    const { managers, result } = await setup();
    await act(() => result.current.choosePhoto('library'));
    expect(managers.sessions.profile.get().photo).toBe('file:///photos/1.jpg');
    expect(managers.photos.calls).toEqual(['pick library', 'remove file:///old.jpg']);
    await act(() => result.current.choosePhoto('remove'));
    expect(managers.sessions.profile.get().photo).toBeNull();
  });

  it('counts your sessions and people', async () => {
    const { result } = await setup();
    expect(result.current.sessionCount).toBe(4);
    expect(result.current.peopleCount).toBe(14);
  });
});
