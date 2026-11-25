import { Presence } from '@core/models';
import { Platform } from 'react-native';

/** Design tokens: one place for colour, type, radius and shadow, so every screen looks like one app. */
export const colors = {
  ink: '#0f172a',
  text: '#1e293b',
  muted: '#64748b',
  faint: '#94a3b8',
  line: '#e2e8f0',
  surface: '#ffffff',
  subtle: '#f1f5f9',
  live: '#16a34a',
  liveSoft: '#dcfce7',
  recent: '#d97706',
  recentSoft: '#fef3c7',
  stale: '#64748b',
  staleSoft: '#f1f5f9',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  accent: '#2563eb',
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  default: { elevation: 6 },
});

/** Presence → colour pair and words. Never colour alone: every use also shows the label. */
export function presenceStyle(presence: number): { color: string; soft: string; label: string } {
  if (presence === Presence.Live)
    return { color: colors.live, soft: colors.liveSoft, label: 'Live' };
  if (presence === Presence.Recent)
    return { color: colors.recent, soft: colors.recentSoft, label: 'Recently active' };
  if (presence === Presence.Paused)
    return { color: colors.stale, soft: colors.staleSoft, label: 'Paused sharing' };
  return { color: colors.stale, soft: colors.staleSoft, label: 'Last seen' };
}
