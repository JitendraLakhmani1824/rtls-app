import { colors, PrimaryButton, ScreenHeader } from '@common/ui';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useJoin } from './hooks/useJoin';
import { InviteCard } from './views/InviteCard';
import { WhoAreYou } from './views/WhoAreYou';

/** Opened by an invite link: see the session, say which one you are, join. */
export function JoinScreen() {
  const j = useJoin();
  const insets = useSafeAreaInsets();
  const footer = [styles.footer, { paddingBottom: insets.bottom + 16 }];

  if (j.state === 'broken') {
    return (
      <View style={styles.fill}>
        <ScreenHeader
          title="This invite link doesn’t work"
          subtitle="It may have been cut short. Ask for a new link."
          onBack={j.close}
        />
        <View style={styles.spacer} />
        <View style={footer}>
          <PrimaryButton label="Back to sessions" onPress={j.close} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <ScreenHeader title="Join session" onBack={j.close} />
      <ScrollView contentContainerStyle={styles.content}>
        <InviteCard icon={j.icon} title={j.title} from={j.from} detail={j.detail} />
        {j.state === 'joined' ? (
          <Text style={styles.note}>You’re already in this session.</Text>
        ) : (
          <>
            <WhoAreYou people={j.people} onChoose={j.choose} />
            <Text style={styles.note}>
              Everyone in it shares their location with each other until the session ends.
            </Text>
          </>
        )}
      </ScrollView>
      <View style={footer}>
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
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 22 },
  spacer: { flex: 1 },
  note: { fontSize: 13, color: colors.faint, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.page },
});
