import { colors, PrimaryButton, radius, ScreenHeader } from '@common/ui';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNewSession } from './useNewSession';
import { EventPicker } from './views/EventPicker';
import { PeoplePicker } from './views/PeoplePicker';

/** Start a session: what's happening, a name, and who's coming. */
export function NewSessionScreen() {
  const s = useNewSession();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.fill}>
      <ScreenHeader title="New session" onBack={s.close} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>What’s happening?</Text>
        <EventPicker events={s.events} onPick={s.setEvent} />

        <Text style={styles.section}>Name</Text>
        <TextInput
          value={s.title}
          onChangeText={s.setTitle}
          placeholder={s.placeholder}
          placeholderTextColor={colors.faint}
          style={styles.input}
          maxLength={60}
          returnKeyType="done"
          accessibilityLabel="Session name"
        />

        <View style={styles.whoRow}>
          <Text style={styles.section}>Who’s coming?</Text>
          <Text style={styles.count}>
            {s.count} of {s.max}
          </Text>
        </View>
        <PeoplePicker circles={s.circles} onToggle={s.toggle} onToggleCircle={s.toggleCircle} />
        {s.full && <Text style={styles.hint}>A session holds up to {s.max} friends.</Text>}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label={
            s.canStart
              ? `Start with ${s.count} ${s.count === 1 ? 'person' : 'people'}`
              : 'Pick who’s coming'
          }
          onPress={s.start}
          disabled={!s.canStart}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
  },
  whoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  count: { fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] },
  hint: { fontSize: 13, color: colors.faint, marginTop: 10, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.page },
});
