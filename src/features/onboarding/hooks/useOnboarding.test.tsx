import { ManagersProvider } from '@common/di';
import { createTestManagers } from '@testing/fakes';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useOnboarding } from './useOnboarding';

async function setup() {
  const managers = createTestManagers();
  await managers.sessions.load();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ManagersProvider value={managers}>{children}</ManagersProvider>
  );
  return { managers, ...(await renderHook(() => useOnboarding(), { wrapper })) };
}

describe('useOnboarding', () => {
  it('welcomes you first, then asks for your name and photo', async () => {
    const { result } = await setup();
    expect(result.current.step).toBe('welcome');
    await act(() => result.current.next());
    expect(result.current.step).toBe('profile');
    await act(() => result.current.back());
    expect(result.current.step).toBe('welcome');
  });

  it('needs a name to finish; the photo is optional', async () => {
    const { managers, result } = await setup();
    expect(result.current.canFinish).toBe(false);
    await act(() => result.current.finish());
    expect(managers.sessions.profile.get().onboarded).toBe(false);
    await act(() => result.current.setName('Asha'));
    await act(() => result.current.finish());
    expect(managers.sessions.profile.get()).toEqual({ name: 'Asha', photo: null, onboarded: true });
  });

  it('keeps the photo you pick, and deletes one you replace or remove', async () => {
    const { managers, result } = await setup();
    await act(() => result.current.choosePhoto('library'));
    expect(result.current.photo).toBe('file:///photos/1.jpg');
    managers.photos.next = 'file:///photos/2.jpg';
    await act(() => result.current.choosePhoto('camera'));
    expect(result.current.photo).toBe('file:///photos/2.jpg');
    await act(() => result.current.choosePhoto('remove'));
    expect(result.current.photo).toBeNull();
    expect(managers.photos.calls).toEqual([
      'pick library',
      'pick camera',
      'remove file:///photos/1.jpg',
      'remove file:///photos/2.jpg',
    ]);
  });

  it('keeps the current photo when you cancel the picker', async () => {
    const { managers, result } = await setup();
    await act(() => result.current.choosePhoto('library'));
    managers.photos.next = null;
    await act(() => result.current.choosePhoto('library'));
    await act(() => result.current.choosePhoto(null));
    expect(result.current.photo).toBe('file:///photos/1.jpg');
  });
});
