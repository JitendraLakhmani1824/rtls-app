import type { NavigatorScreenParams } from '@react-navigation/native';

/** The two tabs. */
export type TabsParams = {
  Sessions: undefined;
  Friends: undefined;
};

/** Route names and their params. Features navigate by name, so they never import each other. */
export type RootStack = {
  Tabs: NavigatorScreenParams<TabsParams> | undefined;
  /** `with`: a person to start with (from their page). */
  NewSession: { with?: string } | undefined;
  /** An invite link's parts: `rtls://join/<code>?e=…&t=…&p=…&f=…`. */
  Join: { code: string; e?: string; t?: string; p?: string; f?: string };
  /** A session's live map. `focus`: a person to select once the map has them. */
  SessionMap: { id: string; focus?: string };
  /** The selected friend's sheet. No params: the selection lives in the session. */
  Friend: undefined;
  /** A person's page. */
  Person: { key: string };
  /** Your photo and name. */
  Profile: undefined;
};
