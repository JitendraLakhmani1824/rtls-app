/** Route names and their params. Features navigate by name, so they never import each other. */
export type RootStack = {
  Home: undefined;
  /** The selected friend's sheet. No params: the selection lives in the session. */
  Friend: undefined;
};
