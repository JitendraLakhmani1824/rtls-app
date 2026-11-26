import { act, renderHook } from '@testing-library/react-native';

import { MAX_FRIENDS, useStart } from './useStart';

describe('useStart', () => {
  it('starts with 4 friends at a concert', async () => {
    const onStart = jest.fn();
    const { result } = await renderHook(() => useStart(onStart));
    await act(() => result.current.start());
    expect(onStart).toHaveBeenCalledWith({ scenario: 'concert', friends: 4 });
  });

  it('keeps the number of friends between 1 and 20', async () => {
    const { result } = await renderHook(() => useStart(() => {}));
    for (let i = 0; i < 10; i++) await act(() => result.current.less());
    expect(result.current.friends).toBe(1);
    expect(result.current.canLess).toBe(false);
    for (let i = 0; i < 30; i++) await act(() => result.current.more());
    expect(result.current.friends).toBe(MAX_FRIENDS);
    expect(result.current.canMore).toBe(false);
  });

  it('starts the chosen event', async () => {
    const onStart = jest.fn();
    const { result } = await renderHook(() => useStart(onStart));
    await act(() => result.current.setScenario('marathon'));
    await act(() => result.current.more());
    await act(() => result.current.start());
    expect(onStart).toHaveBeenCalledWith({ scenario: 'marathon', friends: 5 });
  });

  it('opens with the last choice when coming back', async () => {
    const { result } = await renderHook(() =>
      useStart(() => {}, { scenario: 'trip', friends: 12 }),
    );
    expect(result.current).toMatchObject({ scenario: 'trip', friends: 12 });
  });
});
