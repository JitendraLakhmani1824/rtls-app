import { ManagersProvider } from '@common/di';
import { createTestManagers, fakeRow } from '@testing/fakes';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useFriendList, toItem } from './useFriendList';
import { useHome } from './useHome';

const mockNavigation = { navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));

function wrapper(managers: ReturnType<typeof createTestManagers>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ManagersProvider value={managers}>{children}</ManagersProvider>;
  };
}

describe('useHome', () => {
  beforeEach(() => mockNavigation.navigate.mockClear());

  it('opens the friend sheet whenever someone is selected, however they were selected', async () => {
    const managers = createTestManagers();
    await renderHook(() => useHome(), { wrapper: wrapper(managers) });
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    await act(() => managers.session.select(3));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Friend');
  });

  it('hides the list panel while a friend’s sheet is open: one bottom surface at a time', async () => {
    const managers = createTestManagers();
    const { result } = await renderHook(() => useHome(), { wrapper: wrapper(managers) });
    expect(result.current.showPanel).toBe(true);
    await act(() => managers.session.select(2));
    expect(result.current.showPanel).toBe(false);
    await act(() => managers.session.select(null));
    expect(result.current.showPanel).toBe(true);
  });

  it('shows the connection in words', async () => {
    const managers = createTestManagers();
    managers.session.connection.set({ kind: 'reconnecting', sinceMs: 0 });
    const { result } = await renderHook(() => useHome(), { wrapper: wrapper(managers) });
    expect(result.current.connection.label).toBe('Reconnecting…');
    const at = new Date(2026, 10, 26, 14, 5).getTime();
    await act(() => managers.session.connection.set({ kind: 'offline', sinceMs: at }));
    expect(result.current.connection.label).toBe('Offline · as of 14:05');
  });

  it('counts who is live for the title card', async () => {
    const managers = createTestManagers();
    managers.session.rows.set([fakeRow(1), fakeRow(2), fakeRow(3, { presence: 2 })]);
    const { result } = await renderHook(() => useHome(), { wrapper: wrapper(managers) });
    expect(result.current.summary).toBe('2 of 3 friends live');
    expect(result.current.title).toBe('Test session');
  });

  it('opens and closes the friend list', async () => {
    const { result } = await renderHook(() => useHome(), {
      wrapper: wrapper(createTestManagers()),
    });
    expect(result.current.listOpen).toBe(false);
    await act(() => result.current.toggleList());
    expect(result.current.listOpen).toBe(true);
  });
});

describe('useFriendList', () => {
  it('selects a friend when their row is tapped', async () => {
    const managers = createTestManagers();
    managers.session.rows.set([fakeRow(1), fakeRow(2)]);
    const { result } = await renderHook(() => useFriendList(), { wrapper: wrapper(managers) });
    expect(result.current.items.map((i) => i.id)).toEqual([1, 2]);
    await act(() => result.current.select(2));
    expect(managers.session.calls).toEqual(['select 2']);
  });

  it('describes each friend in words, with distance and direction apart', () => {
    expect(toItem(fakeRow(1, { distanceM: 350, bearingDeg: 45, speedMs: 1.2 }))).toMatchObject({
      status: 'Live · walking',
      distance: '350 m',
      direction: 'NE',
    });
    expect(toItem(fakeRow(2, { presence: 2, silentMs: 600_000 })).status).toBe(
      'Last seen 10 min ago',
    );
    expect(toItem(fakeRow(3, { presence: 1, silentMs: 90_000 })).status).toBe('Active 2 min ago');
    expect(toItem(fakeRow(4, { presence: 3 })).status).toBe('Paused sharing');
  });
});
