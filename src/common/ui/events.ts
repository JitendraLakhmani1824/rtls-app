import type { EventKind } from '@core/models';

/** How each kind of event looks in the app. */
export const EVENTS: Record<
  EventKind,
  { icon: string; name: string; detail: string; defaultTitle: string }
> = {
  concert: {
    icon: '🎵',
    name: 'Concert',
    detail: 'Most people standing, a few walking about',
    defaultTitle: 'Concert at BKC',
  },
  marathon: {
    icon: '🏃',
    name: 'Marathon',
    detail: 'Runners on a 5 km loop, friends cheering',
    defaultTitle: 'City Marathon',
  },
  trip: {
    icon: '🚗',
    name: 'Road trip',
    detail: 'Friends in cars on a highway',
    defaultTitle: 'Road trip',
  },
};
