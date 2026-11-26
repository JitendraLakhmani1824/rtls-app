import { useManagers, usePeople, useProfile, useSessionList } from '@common/di';
import type { RootStack } from '@common/navigation';
import type { PhotoChoice } from '@common/ui';
import { initialsOf } from '@core/utils';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';

/** Your profile: photo (saved at once), name (saved when you tap Save or finish typing). */
export function useProfileScreen() {
  const { sessions, photos } = useManagers();
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const profile = useProfile();
  const sessionCount = useSessionList().length;
  const peopleCount = usePeople().length;
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? profile.name;
  const changed = draft !== null && draft.trim() !== profile.name && draft.trim() !== '';

  const setPhoto = (uri: string | null) => {
    const old = profile.photo;
    sessions.updateProfile({ photo: uri });
    if (old && old !== uri) void photos.remove(old);
  };

  return {
    name,
    setName: setDraft,
    initials: initialsOf(name.trim() || '?'),
    photo: profile.photo,
    changed,
    save: () => {
      if (changed && draft !== null) sessions.updateProfile({ name: draft });
      setDraft(null);
    },
    choosePhoto: async (choice: PhotoChoice | null) => {
      if (choice === null) return;
      if (choice === 'remove') return setPhoto(null);
      const uri = await photos.pick(choice);
      if (uri) setPhoto(uri);
    },
    sessionCount,
    peopleCount,
    back: () => navigation.goBack(),
  };
}
