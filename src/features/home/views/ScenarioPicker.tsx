import { colors, radius, shadow } from '@common/ui';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { FRIEND_CHOICES, SCENARIO_CHOICES, type useScenarioPicker } from '../useScenarioPicker';

/** A small dialog: which event to simulate, and how many friends. */
export function ScenarioPicker({ picker }: { picker: ReturnType<typeof useScenarioPicker> }) {
  return (
    <Modal visible={picker.visible} transparent animationType="fade" onRequestClose={picker.close}>
      <Pressable style={styles.backdrop} onPress={picker.close} accessibilityLabel="Close">
        <Pressable style={[styles.card, shadow]} onPress={() => {}}>
          <Text style={styles.title}>Demo scenario</Text>
          <Text style={styles.subtitle}>Friends are simulated on this phone.</Text>

          <Text style={styles.section}>Event</Text>
          {SCENARIO_CHOICES.map((c) => {
            const on = picker.scenario === c.name;
            return (
              <Pressable
                key={c.name}
                onPress={() => picker.setScenario(c.name)}
                style={[styles.option, on && styles.optionOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <View style={[styles.radio, on && styles.radioOn]} />
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{c.label}</Text>
                  <Text style={styles.optionDetail}>{c.detail}</Text>
                </View>
              </Pressable>
            );
          })}

          <Text style={styles.section}>Friends</Text>
          <View style={styles.segment}>
            {FRIEND_CHOICES.map((n) => {
              const on = picker.friends === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => picker.setFriends(n)}
                  style={[styles.segmentItem, on && styles.segmentOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable onPress={picker.close} style={styles.secondary} accessibilityRole="button">
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={picker.start} style={styles.primary} accessibilityRole="button">
              <Text style={styles.primaryText}>Start</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4 },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
  },
  optionOn: { borderColor: colors.accent, backgroundColor: '#eff6ff' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.faint },
  radioOn: { borderColor: colors.accent, borderWidth: 6 },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: colors.ink },
  optionDetail: { fontSize: 13, color: colors.muted, marginTop: 2 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.subtle,
    borderRadius: radius.md,
    padding: 4,
  },
  segmentItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm },
  segmentOn: { backgroundColor: colors.surface, ...shadow },
  segmentText: { fontSize: 15, fontWeight: '600', color: colors.muted },
  segmentTextOn: { color: colors.ink },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  secondary: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.subtle,
  },
  secondaryText: { fontSize: 16, fontWeight: '600', color: colors.ink },
  primary: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  primaryText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
});
