import { Chevron, colors, radius, typeScale } from '@common/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SharedSession } from '../hooks/usePerson';

/** The sessions you share with them; each opens its map, focused on them. */
export function SessionsTogether({
  sessions,
  onOpen,
}: {
  sessions: SharedSession[];
  onOpen: (id: string) => void;
}) {
  if (sessions.length === 0) return null;
  return (
    <View>
      <Text style={styles.section}>Sessions together</Text>
      <View style={styles.list}>
        {sessions.map((s, i) => (
          <Pressable
            key={s.id}
            onPress={() => onOpen(s.id)}
            style={({ pressed }) => [
              styles.row,
              i < sessions.length - 1 && styles.rowLine,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${s.title}, ${s.detail}. Opens the map.`}
          >
            <Text style={styles.icon}>{s.icon}</Text>
            <View style={styles.text}>
              <Text style={styles.title} numberOfLines={1}>
                {s.title}
              </Text>
              <Text style={styles.detail}>{s.detail}</Text>
            </View>
            <Chevron color={colors.faint} size={8} direction="right" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { ...typeScale.label, marginBottom: 10 },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 62, paddingHorizontal: 14 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pressed: { backgroundColor: colors.subtle },
  icon: { fontSize: 22 },
  text: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: colors.ink },
  detail: { fontSize: 13, color: colors.muted, marginTop: 1 },
});
