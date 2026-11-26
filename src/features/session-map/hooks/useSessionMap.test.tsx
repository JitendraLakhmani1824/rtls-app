import { ManagersProvider } from '@common/di';
import { createTestManagers, fakeRow, type TestManagers } from '@testing/fakes';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Share } from 'react-native';

import { toItem, useFriendList } from './useFriendList';
import { useSessionMap } from './useSessionMap';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setParams: jest.fn(),
  canGoBack: () => true,
};
let mockParams: { id: string; focus?: string } = { id: 'TEST01' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockParams }),
  useFocusEffect: (effect: () => void) =>
    jest.requireActual('react').useEffect(() => effect(), [effect]),
}));

function wrapper(managers: TestManagers) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ManagersProvider value={managers}>{children}</ManagersProvider>;
  };
}

async function setup(managers = createTestManagers()) {
  const hook = await renderHook(() => useSessionMap(), { wrapper: wrapper(managers) });
  return { managers, ...hook };
}

describe('useSessionMap', () => {
  beforeEach(() => {
    mockParams = { id: 'TEST01' };
    jest.clearAllMocks();
  });

  it('runs the session while its map is open and stops it when the map closes', async () => {
    const { managers, unmount } = await setup();
    expect(managers.live.calls).toEqual(['open TEST01']);
    await unmount();
    expect(managers.live.calls).toEqual(['open TEST01', 'close TEST01']);
  });

  it('opens the friend sheet whenever someone is selected, however they were selected', async () => {
    const { managers } = await setup();
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    await act(() => managers.session.select(3));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Friend');
  });

  it('hides the list panel while a friend’s sheet is open: one bottom surface at a time', async () => {
    const { managers, result } = await setup();
    expect(result.current.showPanel).toBe(true);
    await act(() => managers.session.select(2));
    expect(result.current.showPanel).toBe(false);
    await act(() => managers.session.select(null));
    expect(result.current.showPanel).toBe(true);
  });

  it('shows the connection in words', async () => {
    const managers = createTestManagers();
    managers.session.connection.set({ kind: 'reconnecting', sinceMs: 0 });
    const { result } = await setup(managers);
    expect(result.current.connection.label).toBe('Reconnecting…');
    const at = new Date(2026, 10, 26, 14, 5).getTime();
    await act(() => managers.session.connection.set({ kind: 'offline', sinceMs: at }));
    expect(result.current.connection.label).toBe('Offline · as of 14:05');
  });

  it('counts who is live for the title card', async () => {
    const managers = createTestManagers();
    managers.session.rows.set([fakeRow(1), fakeRow(2), fakeRow(3, { presence: 2 })]);
    const { result } = await setup(managers);
    expect(result.current.summary).toBe('2 of 3 friends live');
    expect(result.current.title).toBe('Test session');
  });

  it('selects the person it was opened to show, once the map has them', async () => {
    const managers = createTestManagers();
    mockParams = { id: 'TEST01', focus: 'friend-2' };
    await setup(managers);
    expect(managers.session.calls).toEqual([]);
    await act(() => managers.session.rows.set([fakeRow(1), fakeRow(2)]));
    expect(managers.session.calls).toEqual(['select 2']);
    expect(mockNavigation.setParams).toHaveBeenCalledWith({ focus: undefined });
  });

  it('shares an invite link for a saved session, and none for a measurement run', async () => {
    const managers = createTestManagers();
    await managers.sessions.load();
    const record = managers.sessions.create({ title: 'Beach', event: 'trip', people: ['mom'] });
    managers.live.views.set(record.id, { ...managers.view, id: record.id });
    mockParams = { id: record.id };
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    const { result } = await setup(managers);
    expect(result.current.canInvite).toBe(true);
    await act(() => result.current.invite());
    expect(share.mock.calls[0]?.[0]).toMatchObject({
      message: expect.stringContaining(`rtls://join/${record.id}?e=trip&t=Beach`),
    });

    mockParams = { id: 'TEST01' };
    const { result: run } = await setup(managers);
    expect(run.current.canInvite).toBe(false);
  });

  it('says so when the session isn’t on this phone', async () => {
    mockParams = { id: 'GONE22' };
    const { result } = await setup();
    expect(result.current.MapView).toBeNull();
  });

  it('opens and closes the friend list', async () => {
    const { result } = await setup();
    expect(result.current.listOpen).toBe(false);
    await act(() => result.current.toggleList());
    expect(result.current.listOpen).toBe(true);
  });
});

describe('useFriendList', () => {
  it('selects a friend when their row is tapped', async () => {
    const managers = createTestManagers();
    managers.session.rows.set([fakeRow(1), fakeRow(2)]);
    const { result } = await renderHook(() => useFriendList(managers.session), {
      wrapper: wrapper(managers),
    });
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
