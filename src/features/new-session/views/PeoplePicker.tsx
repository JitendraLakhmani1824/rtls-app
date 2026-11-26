import { Avatar, Check, colors, radius } from '@common/ui';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PickCircle, PickPerson } from '../hooks/useNewSession';

/** Family and friends as checklists, each with "Select all". */
export function PeoplePicker({
  circles,
  onToggle,
  onToggleCircle,
}: {
  circles: PickCircle[];
  onToggle: (key: string) => void;
  onToggleCircle: (circle: PickCircle) => void;
}) {
  return (
    <View style={styles.list}>
      {circles.map((circle) => (
        <View key={circle.circle} style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.circle}>{circle.title}</Text>
            <Pressable
              onPress={() => onToggleCircle(circle)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${circle.allChosen ? 'Clear' : 'Select all'} ${circle.title}`}
            >
              <Text style={styles.all}>{circle.allChosen ? 'Clear' : 'Select all'}</Text>
            </Pressable>
          </View>
          {circle.people.map((p) => (
            <Row key={p.key} person={p} onToggle={onToggle} />
          ))}
        </View>
      ))}
    </View>
  );
}

const Row = memo(function Row({
  person,
  onToggle,
}: {
  person: PickPerson;
  onToggle: (key: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onToggle(person.key)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: person.chosen }}
      accessibilityLabel={person.name}
    >
      <Avatar initials={person.initials} colour={person.colour} size={36} />
      <Text style={styles.name}>{person.name}</Text>
      <View style={[styles.box, person.chosen && styles.boxOn]}>
        {person.chosen && <Check color={colors.ink} size={12} />}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  circle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  all: { fontSize: 14, fontWeight: '600', color: colors.accentInk },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    paddingHorizontal: 14,
  },
  pressed: { backgroundColor: colors.subtle },
  name: { flex: 1, fontSize: 16, color: colors.text },
  box: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
