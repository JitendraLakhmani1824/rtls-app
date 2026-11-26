import {
  askPhotoSource,
  colors,
  HeaderButton,
  PhotoButton,
  ScreenHeader,
  StatTile,
} from '@common/ui';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useProfileScreen } from './hooks/useProfileScreen';
import { NameField } from './views/NameField';
import { PrivacyNote } from './views/PrivacyNote';

/** Your photo and name, as friends see them. */
export function ProfileScreen() {
  const p = useProfileScreen();
  return (
    <View style={styles.fill}>
      <ScreenHeader
        title=""
        onBack={p.back}
        right={p.changed ? <HeaderButton label="Save" onPress={p.save} a11y="Save name" /> : null}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PhotoButton
          photo={p.photo}
          initials={p.initials}
          onPress={async () => p.choosePhoto(await askPhotoSource(p.photo !== null))}
        />
        <NameField name={p.name} onChange={p.setName} onDone={p.save} />
        <View style={styles.tiles}>
          <StatTile label="Sessions" value={String(p.sessionCount)} />
          <StatTile label="People" value={String(p.peopleCount)} />
        </View>
        <PrivacyNote />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: 24, paddingBottom: 32, gap: 24 },
  tiles: { flexDirection: 'row', gap: 10 },
});
