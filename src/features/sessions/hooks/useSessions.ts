import { useManagers, useProfile, useSessionList } from '@common/di';
import type { RootStack } from '@common/navigation';
import { EVENTS } from '@common/ui';
import { formatPeople, inviteMessage } from '@common/utils';
import { MAX_FRIENDS, ME_KEY, type SessionRecord } from '@core/models';
import { colourFor, initialsOf } from '@core/utils';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Share } from 'react-native';

export type SessionCard = {
  id: string;
  title: string;
  icon: string;
  /** "Road trip · 5 people" */
  detail: string;
  avatars: { key: string; initials: string; colour: string }[];
  /** People not shown in the avatar stack. */
  more: number;
  /** Small enough to invite by link (no server for bigger groups). */
  canInvite: boolean;
};

const AVATARS = 4;

/** Your sessions: open one, start one, invite to one, leave one. */
export function useSessions() {
  const { sessions } = useManagers();
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const list = useSessionList();
  const profile = useProfile();
  const firstName = profile.name.split(' ')[0] ?? '';
  return {
    greeting: firstName ? `Hi, ${firstName}` : 'Your sessions',
    me: { initials: initialsOf(profile.name || '?'), photo: profile.photo },
    openProfile: () => navigation.navigate('Profile'),
    cards: list.map(toCard),
    open: (id: string) => navigation.navigate('SessionMap', { id }),
    create: () => navigation.navigate('NewSession'),
    invite: (id: string) => {
      const record = sessions.get(id);
      if (record)
        void Share.share({
          message: inviteMessage(sessions.profile.get().name, record.title, sessions.inviteUrl(id)),
        });
    },
    leave: (id: string) => sessions.remove(id),
  };
}

export function toCard(record: SessionRecord): SessionCard {
  const others = record.people.filter((p) => p.key !== ME_KEY);
  return {
    id: record.id,
    title: record.title,
    icon: EVENTS[record.event].icon,
    detail: `${EVENTS[record.event].name} · ${formatPeople(record.people.length)}`,
    avatars: others
      .slice(0, AVATARS)
      .map((p) => ({ key: p.key, initials: initialsOf(p.name), colour: colourFor(p.key) })),
    more: Math.max(0, others.length - AVATARS),
    canInvite: record.people.length <= MAX_FRIENDS + 1,
  };
}
