import { ManagersProvider } from '@common/di';
import { createTestManagers, fakeRow } from '@testing/fakes';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { usePerson } from './usePerson';

const mockNavigation = {
  navigate: jest.fn(),
  push: jest.fn(),
  popTo: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
};
let mockKey = 'riya';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { key: mockKey } }),
}));

async function setup() {
  const managers = createTestManagers();
  await managers.sessions.load();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ManagersProvider value={managers}>{children}</ManagersProvider>
  );
  return { managers, ...(await renderHook(() => usePerson(), { wrapper })) };
}

describe('usePerson', () => {
  beforeEach(() => {
    mockKey = 'riya';
    jest.clearAllMocks();
  });

  it('shows who they are and the sessions you share', async () => {
    const { result } = await setup();
    expect(result.current).toMatchObject({ name: 'Riya', initials: 'R', circle: 'Friend' });
    expect(result.current.together.map((s) => s.title)).toEqual(['Concert night']);
    expect(result.current.live).toBeNull(); // not on the open map
  });

  it('shows live numbers while they’re on the open map, updating with it', async () => {
    const { managers, result } = await setup();
    await act(() =>
      managers.session.rows.set([
        fakeRow(4, { key: 'riya', distanceM: 1200, bearingDeg: 180, speedMs: 3, coveredM: 2500 }),
      ]),
    );
    expect(result.current.live).toMatchObject({
      where: 'Test session',
      status: 'Live',
      distance: '1.2 km',
      direction: 'S',
      movement: 'Running',
      speed: '11 km/h',
      covered: '2.5 km',
    });
    await act(() => managers.live.close('TEST01'));
    expect(result.current.live).toBeNull();
  });

  it('goes back to the open map to show them, or opens another session’s map on top', async () => {
    const { managers, result } = await setup();
    await act(() => managers.session.rows.set([fakeRow(4, { key: 'riya' })]));
    await act(() => result.current.showOnMap());
    expect(mockNavigation.popTo).toHaveBeenCalledWith('SessionMap', {
      id: 'TEST01',
      focus: 'riya',
    });
    await act(() => result.current.openSession('OTHER2'));
    expect(mockNavigation.push).toHaveBeenCalledWith('SessionMap', { id: 'OTHER2', focus: 'riya' });
  });

  it('starts a new session with them', async () => {
    const { result } = await setup();
    await act(() => result.current.startWith());
    expect(mockNavigation.navigate).toHaveBeenCalledWith('NewSession', { with: 'riya' });
  });
});
