import { ManagersProvider } from '@common/di';
import { RungAScreen } from '@lab/ladder';
import { NavigationContainer } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createContainer, VENUE } from './container';
import { paramsKey, useLaunchParams, type LaunchParams } from './launch-params';
import { AppNavigation } from './navigation';

export function Root() {
  const params = useLaunchParams();
  if (!params) return null;
  // A new scenario link rebuilds everything from scratch (the key changes).
  if (params.rung === 'A') {
    return (
      <RungAScreen
        key={paramsKey(params)}
        scenario={params.scenario}
        friends={params.friends}
        seed={params.seed}
        intervalMs={params.intervalMs}
        center={VENUE}
      />
    );
  }
  return <AppShell key={paramsKey(params)} params={params} />;
}

function AppShell({ params }: { params: LaunchParams }) {
  const [container] = useState(() => createContainer(params));
  useEffect(() => container.start(), [container]);
  return (
    <SafeAreaProvider>
      <ManagersProvider value={container.screens}>
        <NavigationContainer>
          <AppNavigation />
        </NavigationContainer>
      </ManagersProvider>
    </SafeAreaProvider>
  );
}
