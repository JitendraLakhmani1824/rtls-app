import type { Session } from '@core/protocols';
import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from 'react';

/** Everything a screen may use. Screens never see the feed, the device or the map manager. */
export type Screens = {
  session: Session;
  MapView: ComponentType;
};

const ScreensContext = createContext<Screens | null>(null);

export function ManagersProvider({ value, children }: { value: Screens; children: ReactNode }) {
  return <ScreensContext.Provider value={value}>{children}</ScreensContext.Provider>;
}

export function useManagers(): Screens {
  const screens = useContext(ScreensContext);
  if (!screens)
    throw new Error('useManagers() needs a <ManagersProvider> above it (set up in src/app).');
  return screens;
}

/** The selected friend, or null. Re-renders only when the selection changes. */
export function useSelected(): number | null {
  const { session } = useManagers();
  return useSyncExternalStore(session.selected.subscribe, session.selected.get);
}

/** Live / Reconnecting / Offline. Re-renders only when it changes. */
export function useConnection() {
  const { session } = useManagers();
  return useSyncExternalStore(session.connection.subscribe, session.connection.get);
}
