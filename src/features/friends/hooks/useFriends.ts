import { useManagers, usePeople, useProfile, useSessionList } from '@common/di';
import type { RootStack } from '@common/navigation';
import type { Circle } from '@core/models';
import { colourFor, initialsOf } from '@core/utils';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';

export type FriendItem = {
  key: string;
  name: string;
  initials: string;
  colour: string;
  /** "In 2 sessions", "Not in a session yet". */
  detail: string;
};

const CIRCLES: { circle: Circle; title: string }[] = [
  { circle: 'family', title: 'Family' },
  { circle: 'friends', title: 'Friends' },
];

/** Everyone you know, you at the top (opens your profile), and adding someone. */
export function useFriends() {
  const { sessions } = useManagers();
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const people = usePeople();
  const list = useSessionList();
  const profile = useProfile();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCircle, setNewCircle] = useState<Circle>('friends');

  const sessionsWith = (key: string) =>
    list.filter((s) => s.people.some((p) => p.key === key)).length;
  const sections = CIRCLES.map(({ circle, title }) => ({
    title,
    data: people
      .filter((p) => p.circle === circle)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p): FriendItem => {
        const n = sessionsWith(p.key);
        return {
          key: p.key,
          name: p.name,
          initials: initialsOf(p.name),
          colour: colourFor(p.key),
          detail: n === 0 ? 'Not in a session yet' : `In ${n} session${n === 1 ? '' : 's'}`,
        };
      }),
  })).filter((s) => s.data.length > 0);

  return {
    sections,
    count: people.length,
    me: {
      name: profile.name || 'Add your name',
      initials: initialsOf(profile.name || '?'),
      photo: profile.photo,
    },
    openProfile: () => navigation.navigate('Profile'),
    open: (key: string) => navigation.navigate('Person', { key }),
    adding,
    startAdding: () => setAdding(true),
    cancelAdding: () => {
      setAdding(false);
      setNewName('');
    },
    newName,
    setNewName,
    newCircle,
    setNewCircle,
    canAdd: newName.trim().length > 0,
    add: () => {
      if (newName.trim().length === 0) return;
      sessions.addPerson(newName, newCircle);
      setAdding(false);
      setNewName('');
    },
  };
}
