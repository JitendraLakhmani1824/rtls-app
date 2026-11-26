import { Presence } from '@core/models';
import { Platform } from 'react-native';

/**
 * Design tokens: one place for colour, radius and shadow, so every screen looks like one app.
 * Palette: Whiteout #FBFBFB · Nebulous White #DDDFDD · Astroscopus Grey #AEB4B7 · Indian Dance
 * #F69175 · Hypnotic #677782 · Tricon Black #2F2F2F. Coral is for fills (2.3:1 on white is too faint
 * for text); text on coral is ink (5.9:1); coral text uses accentInk (5.4:1).
 */
export const colors = {
  /** Tricon Black: text, primary buttons, the tab bar. */
  ink: '#2F2F2F',
  text: '#2F2F2F',
  /** Hypnotic: secondary text and icons. */
  muted: '#677782',
  /** Astroscopus Grey: placeholders, disabled, chevrons. */
  faint: '#AEB4B7',
  /** Nebulous White: borders and dividers. */
  line: '#DDDFDD',
  surface: '#FFFFFF',
  /** Tiles, inputs and pressed rows. */
  subtle: '#F2F3F2',
  /** Whiteout: the page behind cards. */
  page: '#FBFBFB',
  /** Indian Dance: the brand accent, for fills and highlights. */
  accent: '#F69175',
  accentSoft: '#FDECE6',
  /** Coral text on light backgrounds. */
  accentInk: '#B4472B',
  live: '#2E9E6A',
  liveSoft: '#E3F4EB',
  recent: '#C27A12',
  recentSoft: '#FBF0DC',
  stale: '#677782',
  staleSoft: '#EEF0F1',
  danger: '#C8402A',
  dangerSoft: '#FBE7E2',
  /** My own dot on the map: blue, the convention for "you are here". */
  me: '#2563EB',
} as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: '#2F2F2F',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  default: { elevation: 4 },
});

/** Type scale: one family (the system font), few sizes, medium-heavy weights. */
export const typeScale = {
  hero: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6, color: '#2F2F2F' },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, color: '#2F2F2F' },
  heading: { fontSize: 17, fontWeight: '600', color: '#2F2F2F' },
  body: { fontSize: 15, color: '#2F2F2F' },
  caption: { fontSize: 13, color: '#677782' },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#677782',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
} as const;

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
