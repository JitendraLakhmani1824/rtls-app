import { ManagersProvider } from '@common/di';
import type { RootStack } from '@common/navigation';
import { RungAScreen, RungBCScreen } from '@lab/ladder';
import { NavigationContainer, type InitialState } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createApp, SCENARIO_ID, VENUE, type App } from './container';
import { paramsKey, useLaunch, type LaunchParams } from './launch-params';
import { linking } from './linking';
import { AppNavigation } from './navigation';

/**
 * The app: sessions and friends in tabs, each session's live map, deep links. A scenario link
 * (measurement) opens that scenario's map directly, or a comparison rung from the lab.
 */
export function Root() {
  const launch = useLaunch();
  const [app] = useState(createApp);
  useEffect(() => app.start(), [app]);
  const { loaded } = app.screens.sessions;
  const ready = useSyncExternalStore(loaded.subscribe, loaded.get);
  if (!launch.ready) return null;
  const params = launch.params;
  // A new scenario rebuilds everything from scratch (the key changes).
  if (params?.rung === 'A') {
    return (
      <RungAScreen
        key={paramsKey(params)}
        scenario={params.scenario}
        friends={params.friends + 1}
        seed={params.seed}
        intervalMs={params.intervalMs}
        center={VENUE}
      />
    );
  }
  if (params?.rung === 'B' || params?.rung === 'C') {
    return (
      <RungBCScreen
        key={paramsKey(params)}
        rung={params.rung}
        scenario={params.scenario}
        friends={params.friends + 1}
        seed={params.seed}
        intervalMs={params.intervalMs}
        center={VENUE}
      />
    );
  }
  if (!ready) return null; // the saved book loads in a few milliseconds
  return <AppShell key={params ? paramsKey(params) : 'app'} app={app} scenario={params} />;
}

function AppShell({ app, scenario }: { app: App; scenario: LaunchParams | null }) {
  const [initialState] = useState(() => {
    if (!scenario) return undefined;
    app.openScenario(scenario);
    const routes: { name: keyof RootStack; params?: object }[] = [
      { name: 'Tabs' },
      { name: 'SessionMap', params: { id: SCENARIO_ID } },
    ];
    return { routes } as InitialState;
  });
  return (
    <SafeAreaProvider>
      {/* Every screen is light (pages and the map): dark status-bar icons on both platforms. */}
      <StatusBar style="dark" />
      <ManagersProvider value={app.screens}>
        <NavigationContainer linking={linking} initialState={initialState}>
          <AppNavigation />
        </NavigationContainer>
      </ManagersProvider>
    </SafeAreaProvider>
  );
}
