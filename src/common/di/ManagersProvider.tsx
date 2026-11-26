import type { ConnState, FriendRow, Person, SessionRecord } from '@core/models';
import type { Readable, Session, Sessions } from '@core/protocols';
import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from 'react';

/** One session's live map: the session, and a map view bound to it. */
export type LiveView = { id: string; session: Session; MapView: ComponentType };

/**
 * The live maps. Only one session runs at a time (the one whose map is open), so the others cost
 * nothing. Implemented in app/, the only place that creates managers.
 */
export interface LiveSessions {
  /** The running session, or null while no map is open. */
  readonly current: Readable<LiveView | null>;
  /** A session's live view, built on first use but not started; null if there is no such session. */
  view(id: string): LiveView | null;
  /** Runs this session, stopping any other. */
  open(id: string): void;
  /** Stops this session if it is the one running. */
  close(id: string): void;
}

/** Everything a screen may use. Screens never see the feed, the device, storage or the map manager. */
export type Screens = {
  sessions: Sessions;
  live: LiveSessions;
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

function useReadable<T>(readable: Readable<T>): T {
  return useSyncExternalStore(readable.subscribe, readable.get);
}

const noSubscribe = () => () => {};
const NO_ROWS: FriendRow[] = [];
const NOT_CONNECTED: ConnState = { kind: 'reconnecting', sinceMs: 0 };

/** The running session's live view, or null. Re-renders when another session opens or it closes. */
export function useLive(): LiveView | null {
  return useReadable(useManagers().live.current);
}

/** The selected friend, or null. Re-renders only when the selection changes. */
export function useSelected(session: Session | null | undefined): number | null {
  return useSyncExternalStore(
    session?.selected.subscribe ?? noSubscribe,
    session?.selected.get ?? (() => null),
  );
}

/** Every friend but me, nearest first. Re-renders at most once a second, and only where it's used. */
export function useRows(session: Session | null | undefined): FriendRow[] {
  return useSyncExternalStore(
    session?.rows.subscribe ?? noSubscribe,
    session?.rows.get ?? (() => NO_ROWS),
  );
}

/** Live / Reconnecting / Offline. Re-renders only when it changes. */
export function useConnection(session: Session | null | undefined): ConnState {
  return useSyncExternalStore(
    session?.connection.subscribe ?? noSubscribe,
    session?.connection.get ?? (() => NOT_CONNECTED),
  );
}

/** Your sessions, newest first. */
export function useSessionList(): SessionRecord[] {
  return useReadable(useManagers().sessions.list);
}

/** Everyone you know. */
export function usePeople(): Person[] {
  return useReadable(useManagers().sessions.people);
}

/** Your name, as invites show it. */
export function useMyName(): string {
  return useReadable(useManagers().sessions.myName);
}

/**
 * This person's live row in the session whose map is open, or null if no map is open or they
 * aren't in it. Re-renders at most once a second while a map is open.
 */
export function useLiveRow(key: string): { view: LiveView; row: FriendRow } | null {
  const view = useLive();
  const row = useRows(view?.session).find((r) => r.key === key);
  return view && row ? { view, row } : null;
}
