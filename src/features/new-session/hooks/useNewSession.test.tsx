import { ManagersProvider } from '@common/di';
import { ME_KEY } from '@core/models';
import { createTestManagers } from '@testing/fakes';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useNewSession } from './useNewSession';

const mockNavigation = { replace: jest.fn(), goBack: jest.fn() };
let mockParams: { with?: string } | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockParams }),
}));

async function setup() {
  const managers = createTestManagers();
  await managers.sessions.load();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ManagersProvider value={managers}>{children}</ManagersProvider>
  );
  return { managers, ...(await renderHook(() => useNewSession(), { wrapper })) };
}

describe('useNewSession', () => {
  beforeEach(() => {
    mockParams = undefined;
    jest.clearAllMocks();
  });

  it('can’t start until someone is picked', async () => {
    const { result } = await setup();
    expect(result.current.canStart).toBe(false);
    await act(() => result.current.toggle('riya'));
    expect(result.current.canStart).toBe(true);
    expect(result.current.count).toBe(1);
  });

  it('picks a whole circle at once, and clears it again', async () => {
    const { result } = await setup();
    const family = () => result.current.circles.find((c) => c.circle === 'family')!;
    await act(() => result.current.toggleCircle(family()));
    expect(family().allChosen).toBe(true);
    expect(result.current.count).toBe(5);
    await act(() => result.current.toggleCircle(family()));
    expect(result.current.count).toBe(0);
  });

  it('starts the session, named after the event unless you name it, and opens its map', async () => {
    const { managers, result } = await setup();
    await act(() => result.current.setEvent('marathon'));
    await act(() => result.current.toggle('dev'));
    await act(() => result.current.start());
    const record = managers.sessions.list.get()[0]!;
    expect(record).toMatchObject({ title: 'City Marathon', event: 'marathon' });
    expect(record.people.map((p) => p.key)).toEqual([ME_KEY, 'dev']);
    expect(mockNavigation.replace).toHaveBeenCalledWith('SessionMap', { id: record.id });
  });

  it('starts with the person whose page it was opened from', async () => {
    mockParams = { with: 'nani' };
    const { result } = await setup();
    expect(result.current.count).toBe(1);
    expect(result.current.circles[0]?.people.find((p) => p.key === 'nani')?.chosen).toBe(true);
  });
});
