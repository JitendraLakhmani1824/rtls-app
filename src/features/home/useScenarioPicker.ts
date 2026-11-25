import { useState } from 'react';
import { Linking } from 'react-native';

export const SCENARIO_CHOICES = [
  { name: 'concert', label: 'Concert', detail: 'Most people standing, a few walking' },
  { name: 'marathon', label: 'City marathon', detail: 'Runners on a 5 km loop, spectators' },
  { name: 'trip', label: 'Road trip', detail: 'Friends in cars on a highway' },
] as const;
export const FRIEND_CHOICES = [10, 50, 200] as const;

/**
 * The demo scenario picker. Starting a scenario opens the app's own scenario link, so the app
 * rebuilds from scratch exactly as a deep link would — screens never reach into start-up wiring.
 */
export function useScenarioPicker() {
  const [visible, setVisible] = useState(false);
  const [scenario, setScenario] = useState<(typeof SCENARIO_CHOICES)[number]['name']>('concert');
  const [friends, setFriends] = useState<(typeof FRIEND_CHOICES)[number]>(10);
  return {
    visible,
    open: () => setVisible(true),
    close: () => setVisible(false),
    scenario,
    setScenario,
    friends,
    setFriends,
    start: () => {
      setVisible(false);
      void Linking.openURL(`rtls://scenario?name=${scenario}&friends=${friends}`);
    },
  };
}
