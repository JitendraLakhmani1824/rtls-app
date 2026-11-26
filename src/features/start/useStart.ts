import { useState } from 'react';

export type EventKind = 'concert' | 'marathon' | 'trip';
export type StartChoice = { scenario: EventKind; friends: number };

export const EVENTS: readonly { kind: EventKind; icon: string; title: string; detail: string }[] = [
  {
    kind: 'concert',
    icon: '🎵',
    title: 'Concert',
    detail: 'Most people standing, a few walking about',
  },
  {
    kind: 'marathon',
    icon: '🏃',
    title: 'City marathon',
    detail: 'Runners on a 5 km loop, friends cheering',
  },
  { kind: 'trip', icon: '🚗', title: 'Road trip', detail: 'Friends in cars on a highway' },
];
export const MIN_FRIENDS = 1;
export const MAX_FRIENDS = 20;
export const DEFAULT_FRIENDS = 4;

/** The start page's choices. Starting hands them to the app, which opens the live map. */
export function useStart(onStart: (choice: StartChoice) => void, initial?: StartChoice) {
  const [scenario, setScenario] = useState<EventKind>(initial?.scenario ?? 'concert');
  const [friends, setFriends] = useState(initial?.friends ?? DEFAULT_FRIENDS);
  const change = (by: number) =>
    setFriends((n) => Math.min(MAX_FRIENDS, Math.max(MIN_FRIENDS, n + by)));
  return {
    scenario,
    setScenario,
    friends,
    canLess: friends > MIN_FRIENDS,
    canMore: friends < MAX_FRIENDS,
    less: () => change(-1),
    more: () => change(1),
    start: () => onStart({ scenario, friends }),
  };
}
