import { Avatar, colors, PrimaryButton, radius, ScreenHeader } from '@common/ui';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useJoin } from './useJoin';

/** Opened by an invite link: see the session, say which one you are, join. */
export function JoinScreen() {
  const j = useJoin();
  const insets = useSafeAreaInsets();
  const footer = { paddingBottom: insets.bottom + 16 };

  if (j.state === 'broken') {
    return (
      <View style={styles.fill}>
        <ScreenHeader title="Join session" onBack={j.close} />
        <View style={styles.message}>
          <Text style={styles.messageTitle}>This invite link doesn’t work</Text>
          <Text style={styles.messageText}>It may have been cut short. Ask for a new link.</Text>
        </View>
        <View style={[styles.footer, footer]}>
          <PrimaryButton label="Back to sessions" onPress={j.close} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <ScreenHeader title="Join session" onBack={j.close} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <Text style={styles.emoji}>{j.icon}</Text>
          </View>
          <View style={styles.cardText}>
            <Text style={styles.title}>{j.title}</Text>
            <Text style={styles.detail}>
              {j.from} invited you · {j.detail}
            </Text>
          </View>
        </View>

        {j.state === 'joined' ? (
          <Text style={styles.note}>You’re already in this session.</Text>
        ) : (
          <>
            <Text style={styles.section}>Which one are you?</Text>
            <View style={styles.list} accessibilityRole="radiogroup">
              {j.people.map((p) => (
                <Pressable
                  key={p.index}
                  onPress={() => j.choose(p.index)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: p.chosen }}
                  accessibilityLabel={p.name}
                >
                  <Avatar initials={p.initials} colour={p.colour} size={36} />
                  <Text style={styles.name}>{p.name}</Text>
                  <View style={[styles.radio, p.chosen && styles.radioOn]} />
                </Pressable>
              ))}
            </View>
            <Text style={styles.note}>
              Everyone in it shares their location with each other until the session ends.
            </Text>
          </>
        )}
      </ScrollView>
      <View style={[styles.footer, footer]}>
        {j.state === 'joined' ? (
          <PrimaryButton label="Open map" onPress={j.open} />
        ) : (
          <PrimaryButton
            label={j.canJoin ? 'Join and open map' : 'Pick your name'}
            onPress={j.join}
            disabled={!j.canJoin}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  cardText: { flex: 1 },
  title: { fontSize: 19, fontWeight: '800', color: colors.ink },
  detail: { fontSize: 14, color: colors.muted, marginTop: 3 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 10,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 54, paddingHorizontal: 14 },
  pressed: { backgroundColor: colors.subtle },
  name: { flex: 1, fontSize: 16, color: colors.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.faint },
  radioOn: { borderColor: colors.accent, borderWidth: 7 },
  note: { fontSize: 13, color: colors.faint, marginTop: 14, textAlign: 'center' },
  message: { paddingHorizontal: 24, paddingTop: 24, gap: 8, flex: 1 },
  messageTitle: { fontSize: 20, fontWeight: '700', color: colors.ink },
  messageText: { fontSize: 15, color: colors.muted },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.page },
});
