import { colors, radius } from '@common/ui';
import type { EventKind } from '@core/models';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type EventOption = { kind: EventKind; icon: string; name: string; detail: string; on: boolean };

/** The three kinds of event, as radio cards. */
export function EventPicker({
  events,
  onPick,
}: {
  events: EventOption[];
  onPick: (kind: EventKind) => void;
}) {
  return (
    <View accessibilityRole="radiogroup">
      {events.map((e) => (
        <Pressable
          key={e.kind}
          onPress={() => onPick(e.kind)}
          style={[styles.event, e.on && styles.eventOn]}
          accessibilityRole="radio"
          accessibilityState={{ selected: e.on }}
          accessibilityLabel={`${e.name}. ${e.detail}`}
        >
          <View style={[styles.icon, e.on && styles.iconOn]}>
            <Text style={styles.emoji}>{e.icon}</Text>
          </View>
          <View style={styles.text}>
            <Text style={styles.name}>{e.name}</Text>
            <Text style={styles.detail}>{e.detail}</Text>
          </View>
          <View style={[styles.radio, e.on && styles.radioOn]} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
  eventOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOn: { backgroundColor: colors.accentSoft },
  emoji: { fontSize: 22 },
  text: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: colors.ink },
  detail: { fontSize: 13, color: colors.muted, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.faint },
  radioOn: { borderColor: colors.ink, borderWidth: 7 },
});
