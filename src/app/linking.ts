import type { RootStack } from '@common/navigation';
import type { LinkingOptions } from '@react-navigation/native';

import { isScenarioLink } from './launch-params';

/**
 * Deep links. `rtls://join/<code>?…` opens an invite; `rtls://session/<id>` opens a session's map.
 * Scenario links (measurement) are Root's, before navigation exists.
 */
export const linking: LinkingOptions<RootStack> = {
  prefixes: ['rtls://'],
  filter: (url) => !isScenarioLink(url),
  config: {
    initialRouteName: 'Tabs', // Back from a linked screen goes to the tabs
    screens: {
      Tabs: { screens: { Sessions: 'sessions', Friends: 'friends' } },
      Join: 'join/:code',
      SessionMap: 'session/:id',
    },
  },
};
