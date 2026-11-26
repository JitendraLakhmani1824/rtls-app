import { colors, PrimaryButton, typeScale } from '@common/ui';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Hero } from './Hero';
import { StepDots } from './StepDots';

const PROMISES = [
  {
    icon: '🗺️',
    tint: colors.accentSoft,
    title: 'A live map for each plan',
    detail: 'Family, friends, a running club: one session each.',
  },
  {
    icon: '🔒',
    tint: colors.staleSoft,
    title: 'Shared only inside a session',
    detail: 'With the people in it, and only while it lasts.',
  },
  {
    icon: '🔋',
    tint: colors.liveSoft,
    title: 'Easy on your battery',
    detail: 'Frequent updates only while someone is watching.',
  },
];

/** Step 1: what the app does, and three promises. */
export function WelcomeStep({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
        <View style={styles.brand}>
          <View style={styles.mark}>
            <View style={styles.markDot} />
          </View>
          <Text style={styles.brandText}>RTLS</Text>
        </View>
        <Hero />
        <Text style={styles.hero} accessibilityRole="header">
          See your people, live
        </Text>
        <Text style={styles.sub}>
          One map for every plan: a concert, a race, a road trip. Everyone’s pin, and a short trail
          of where they’ve been.
        </Text>
        <View style={styles.promises}>
          {PROMISES.map((p) => (
            <View key={p.title} style={styles.promise}>
              <View style={[styles.tile, { backgroundColor: p.tint }]}>
                <Text style={styles.tileIcon}>{p.icon}</Text>
              </View>
              <View style={styles.promiseText}>
                <Text style={styles.promiseTitle}>{p.title}</Text>
                <Text style={styles.promiseDetail}>{p.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <StepDots step={0} of={2} />
        <PrimaryButton label="Get started" onPress={onNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  mark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  brandText: { fontSize: 15, fontWeight: '700', color: colors.ink, letterSpacing: 1 },
  hero: { ...typeScale.hero, marginTop: 26 },
  sub: { fontSize: 16, lineHeight: 23, color: colors.muted, marginTop: 8 },
  promises: { marginTop: 22, gap: 16 },
  promise: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tile: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileIcon: { fontSize: 22 },
  promiseText: { flex: 1 },
  promiseTitle: { fontSize: 16, fontWeight: '600', color: colors.ink },
  promiseDetail: { fontSize: 14, color: colors.muted, marginTop: 2 },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 14 },
});
