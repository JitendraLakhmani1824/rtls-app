import { colors, radius, shadow } from '@common/ui';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EVENTS, MAX_FRIENDS, useStart, type StartChoice } from './useStart';

/** The first page: pick the event and how many friends, then open the live map. */
export function StartScreen({
  onStart,
  initial,
}: {
  onStart: (choice: StartChoice) => void;
  /** The last choice, so leaving and coming back keeps it. */
  initial?: StartChoice;
}) {
  const s = useStart(onStart, initial);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.fill, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.markOuter}>
            <View style={styles.markMid}>
              <View style={styles.markDot} />
            </View>
          </View>
          <Text style={styles.title}>Find your friends</Text>
          <Text style={styles.subtitle}>
            See where everyone in your group is, live, with a short trail of where they’ve been.
          </Text>
        </View>

        <Text style={styles.section}>Where are you?</Text>
        {EVENTS.map((e) => {
          const on = s.scenario === e.kind;
          return (
            <Pressable
              key={e.kind}
              onPress={() => s.setScenario(e.kind)}
              style={[styles.event, on && styles.eventOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${e.title}. ${e.detail}`}
            >
              <View style={[styles.eventIcon, on && styles.eventIconOn]}>
                <Text style={styles.eventEmoji}>{e.icon}</Text>
              </View>
              <View style={styles.eventText}>
                <Text style={styles.eventTitle}>{e.title}</Text>
                <Text style={styles.eventDetail}>{e.detail}</Text>
              </View>
              <View style={[styles.radio, on && styles.radioOn]} />
            </Pressable>
          );
        })}

        <Text style={styles.section}>How many friends?</Text>
        <View style={styles.stepperCard}>
          <StepButton label="−" enabled={s.canLess} onPress={s.less} a11y="Fewer friends" />
          <View style={styles.count} accessible accessibilityLabel={`${s.friends} friends`}>
            <Text style={styles.countValue}>{s.friends}</Text>
            <Text style={styles.countLabel}>{s.friends === 1 ? 'friend' : 'friends'} with you</Text>
          </View>
          <StepButton label="+" enabled={s.canMore} onPress={s.more} a11y="More friends" />
        </View>
        <Text style={styles.hint}>Up to {MAX_FRIENDS}. Friends are simulated on this phone.</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={s.start}
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Open live map</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StepButton({
  label,
  enabled,
  onPress,
  a11y,
}: {
  label: string;
  enabled: boolean;
  onPress: () => void;
  a11y: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      style={({ pressed }) => [
        styles.step,
        !enabled && styles.stepOff,
        pressed && styles.stepPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !enabled }}
      hitSlop={8}
    >
      <Text style={[styles.stepText, !enabled && styles.stepTextOff]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  hero: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  markOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  markMid: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    marginBottom: 10,
  },
  eventOn: { borderColor: colors.accent, backgroundColor: '#f5f9ff' },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIconOn: { backgroundColor: '#dbeafe' },
  eventEmoji: { fontSize: 22 },
  eventText: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  eventDetail: { fontSize: 13, color: colors.muted, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.faint },
  radioOn: { borderColor: colors.accent, borderWidth: 7 },
  stepperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  step: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepOff: { backgroundColor: colors.line },
  stepPressed: { opacity: 0.8 },
  stepText: { fontSize: 26, fontWeight: '600', color: '#ffffff', marginTop: -2 },
  stepTextOff: { color: colors.faint },
  count: { alignItems: 'center' },
  countValue: { fontSize: 40, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  countLabel: { fontSize: 13, color: colors.muted, marginTop: -2 },
  hint: { fontSize: 13, color: colors.faint, marginTop: 10, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#f8fafc' },
  primary: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    paddingVertical: 17,
    alignItems: 'center',
    ...shadow,
  },
  primaryPressed: { opacity: 0.9 },
  primaryText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
});
