import { ManagersProvider } from '@common/di';
import { createTestManagers, fakeRow } from '@testing/fakes';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useDetail } from './useDetail';

let mockBeforeRemove: (() => void) | null = null;
const mockNavigation = {
  goBack: jest.fn(),
  canGoBack: () => true,
  addListener: (_event: string, listener: () => void) => {
    mockBeforeRemove = listener;
    return () => {
      mockBeforeRemove = null;
    };
  },
};
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));

async function setup() {
  const managers = createTestManagers();
  managers.session.rows.set([fakeRow(1, { distanceM: 350, bearingDeg: 90 }), fakeRow(2)]);
  managers.session.select(1);
  managers.session.calls.length = 0;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ManagersProvider value={managers}>{children}</ManagersProvider>
  );
  const hook = await renderHook(() => useDetail(), { wrapper });
  return { session: managers.session, ...hook };
}

describe('useDetail', () => {
  beforeEach(() => mockNavigation.goBack.mockClear());

  it('shows the selected friend: status, distance and direction', async () => {
    const { result } = await setup();
    expect(result.current.friend).toMatchObject({
      name: 'Friend 1',
      status: 'Live · updated just now',
      where: '350 m E of you',
    });
  });

  it('follows a new selection without closing', async () => {
    const { result, session } = await setup();
    await act(() => session.select(2));
    expect(result.current.friend?.name).toBe('Friend 2');
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it('closes when the selection is cleared elsewhere', async () => {
    const { session } = await setup();
    await act(() => session.select(null));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('clears the selection when the sheet is dismissed', async () => {
    const { session } = await setup();
    await act(() => mockBeforeRemove?.());
    expect(session.calls).toEqual(['select null']);
  });
});
