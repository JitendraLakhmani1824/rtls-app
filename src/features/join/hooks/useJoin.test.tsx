import { ManagersProvider } from '@common/di';
import { ME_KEY } from '@core/models';
import { createTestManagers } from '@testing/fakes';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useJoin } from './useJoin';

const mockNavigation = { reset: jest.fn(), goBack: jest.fn(), canGoBack: () => true };
const mapOf = (id: string) => ({
  index: 1,
  routes: [{ name: 'Tabs' }, { name: 'SessionMap', params: { id } }],
});
let mockParams: Record<string, string> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockParams }),
}));

const LINK = { code: 'K7Q2XP', e: 'marathon', t: 'Run club', p: 'Asha,Riya,Sam', f: '0' };

async function setup() {
  const managers = createTestManagers();
  await managers.sessions.load();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ManagersProvider value={managers}>{children}</ManagersProvider>
  );
  return { managers, ...(await renderHook(() => useJoin(), { wrapper })) };
}

describe('useJoin', () => {
  beforeEach(() => {
    mockParams = LINK;
    jest.clearAllMocks();
  });

  it('shows who sent the invite and asks which one you are, without the sender', async () => {
    const { result } = await setup();
    expect(result.current).toMatchObject({
      state: 'choose',
      title: 'Run club',
      from: 'Asha',
      detail: 'Marathon · 3 people',
    });
    if (result.current.state !== 'choose') throw new Error('expected a choice');
    expect(result.current.people.map((p) => p.name)).toEqual(['Riya', 'Sam']);
    expect(result.current.canJoin).toBe(false);
  });

  it('joins as the person you pick and opens the map, leaving whatever was open behind', async () => {
    const { managers, result } = await setup();
    if (result.current.state !== 'choose') throw new Error('expected a choice');
    await act(() => (result.current as { choose: (i: number) => void }).choose(2));
    await act(() => (result.current as { join: () => void }).join());
    const record = managers.sessions.get('K7Q2XP')!;
    expect(record.people.map((p) => p.key === ME_KEY)).toEqual([false, false, true]);
    expect(mockNavigation.reset).toHaveBeenCalledWith(mapOf('K7Q2XP'));
  });

  it('just opens a session you already have', async () => {
    const managers = createTestManagers();
    await managers.sessions.load();
    managers.sessions.join(managers.sessions.readInvite(LINK)!, 1);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ManagersProvider value={managers}>{children}</ManagersProvider>
    );
    const { result } = await renderHook(() => useJoin(), { wrapper });
    expect(result.current.state).toBe('joined');
    await act(() => (result.current as { open: () => void }).open());
    expect(mockNavigation.reset).toHaveBeenCalledWith(mapOf('K7Q2XP'));
  });

  it('says a broken link is broken', async () => {
    mockParams = { code: 'nope' };
    const { result } = await setup();
    expect(result.current.state).toBe('broken');
  });
});
