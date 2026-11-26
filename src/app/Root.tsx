import { ManagersProvider } from '@common/di';
import { StartScreen, type StartChoice } from '@features/start';
import { RungAScreen, RungBCScreen } from '@lab/ladder';
import { NavigationContainer } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createContainer, VENUE } from './container';
import { DEFAULT_PARAMS, paramsKey, useLaunch, type LaunchParams } from './launch-params';
import { AppNavigation } from './navigation';

/**
 * The start page, or a session. A scenario link opens a session directly; the start page opens one
 * with the user's choices; leaving a session returns to the start page.
 */
export function Root() {
  const launch = useLaunch();
  const [lastChoice, setLastChoice] = useState<StartChoice>();
  if (!launch.ready) return null;
  const params = launch.params;
  if (!params) {
    return (
      <SafeAreaProvider>
        <StartScreen
          initial={lastChoice}
          onStart={(choice) => {
            setLastChoice(choice);
            launch.start({ ...DEFAULT_PARAMS, ...choice });
          }}
        />
      </SafeAreaProvider>
    );
  }
  // A new scenario rebuilds everything from scratch (the key changes).
  if (params.rung === 'A') {
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
  if (params.rung === 'B' || params.rung === 'C') {
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
  return <AppShell key={paramsKey(params)} params={params} onLeave={launch.exit} />;
}

function AppShell({ params, onLeave }: { params: LaunchParams; onLeave: () => void }) {
  const [container] = useState(() => createContainer(params, onLeave));
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
