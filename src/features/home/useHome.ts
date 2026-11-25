import { useConnection, useManagers, useSelected } from '@common/di';

/** Data and actions for the Home screen. The only file in this feature that touches managers. */
export function useHome() {
  const { MapView, session } = useManagers();
  const connection = useConnection();
  const selected = useSelected();
  return {
    MapView,
    connectionLabel:
      connection.kind === 'live'
        ? 'Live'
        : connection.kind === 'offline'
          ? 'Offline'
          : 'Connecting…',
    selected,
    clearSelection: () => session.select(null),
  };
}
