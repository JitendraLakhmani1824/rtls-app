import { colors, HeaderButton, ScreenHeader, TAB_BAR_SPACE, typeScale } from '@common/ui';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { useFriends } from './hooks/useFriends';
import { AddPerson } from './views/AddPerson';
import { MeCard } from './views/MeCard';
import { PersonRow } from './views/PersonRow';

/** Everyone you know, in Family and Friends. */
export function FriendsScreen() {
  const f = useFriends();
  return (
    <View style={styles.fill}>
      <ScreenHeader
        title="Friends"
        subtitle={`${f.count} people you share with`}
        right={<HeaderButton label="+" onPress={f.startAdding} a11y="Add a person" />}
      />
      <SectionList
        sections={f.sections}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <MeCard me={f.me} onPress={f.openProfile} />
            {f.adding && (
              <AddPerson
                name={f.newName}
                onName={f.setNewName}
                circle={f.newCircle}
                onCircle={f.setNewCircle}
                canAdd={f.canAdd}
                onAdd={f.add}
                onCancel={f.cancelAdding}
              />
            )}
          </>
        }
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item, index, section }) => (
          <PersonRow
            item={item}
            first={index === 0}
            last={index === section.data.length - 1}
            onOpen={f.open}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  list: { paddingHorizontal: 16, paddingBottom: TAB_BAR_SPACE + 16 },
  section: { ...typeScale.label, marginTop: 8, marginBottom: 8, marginLeft: 4 },
});
