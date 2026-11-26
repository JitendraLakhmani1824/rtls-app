import { Avatar, colors, PrimaryButton, ScreenHeader } from '@common/ui';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { usePerson } from './hooks/usePerson';
import { LiveCard } from './views/LiveCard';
import { SessionsTogether } from './views/SessionsTogether';

/** One person: live numbers when they're on the open map, and the sessions you share. */
export function PersonScreen() {
  const p = usePerson();
  return (
    <View style={styles.fill}>
      <ScreenHeader title="" onBack={p.back} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Avatar initials={p.initials} colour={p.colour} size={84} presence={p.live?.presence} />
          <Text style={styles.name} accessibilityRole="header">
            {p.name}
          </Text>
          {p.circle ? <Text style={styles.circle}>{p.circle}</Text> : null}
        </View>
        {p.live ? (
          <LiveCard live={p.live} onShowOnMap={p.showOnMap} />
        ) : (
          <Text style={styles.note}>
            Open a session you share to see where {p.name} is right now.
          </Text>
        )}
        <SessionsTogether sessions={p.together} onOpen={p.openSession} />
        {p.canStartWith && (
          <PrimaryButton
            label={`Start a session with ${p.name}`}
            onPress={p.startWith}
            variant="secondary"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 24 },
  hero: { alignItems: 'center', gap: 6 },
  name: { fontSize: 28, fontWeight: '700', color: colors.ink, marginTop: 8, letterSpacing: -0.5 },
  circle: { fontSize: 15, color: colors.muted },
  note: { fontSize: 15, color: colors.muted, textAlign: 'center', paddingHorizontal: 12 },
});
