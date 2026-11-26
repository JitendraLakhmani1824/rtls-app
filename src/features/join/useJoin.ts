import { useManagers, useSessionList } from '@common/di';
import type { RootStack } from '@common/navigation';
import { EVENTS } from '@common/ui';
import { formatPeople } from '@common/utils';
import { colourFor, initialsOf } from '@core/utils';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';

/**
 * An invite link: who sent it, what it is, and "which one are you?". Joining saves the session
 * and opens its map. A link to a session you already have just opens it.
 */
export function useJoin() {
  const { sessions } = useManagers();
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const params = useRoute<RouteProp<RootStack, 'Join'>>().params;
  useSessionList(); // re-render if the session is joined elsewhere meanwhile
  const invite = sessions.readInvite(params);
  const existing = invite ? sessions.get(invite.code) : undefined;
  const [me, setMe] = useState<number | null>(null);
  const close = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs'));
  // Whatever was open when the link arrived (another map, a sheet) is left behind: sessions, then this map.
  const openMap = (id: string) =>
    navigation.reset({
      index: 1,
      routes: [{ name: 'Tabs' }, { name: 'SessionMap', params: { id } }],
    });

  if (!invite) return { state: 'broken' as const, close };
  const event = EVENTS[invite.event];
  const base = {
    title: invite.title,
    icon: event.icon,
    from: invite.names[invite.from] ?? 'A friend',
    detail: `${event.name} · ${formatPeople(invite.names.length)}`,
    close,
  };
  if (existing) {
    return {
      ...base,
      state: 'joined' as const,
      open: () => openMap(existing.id),
    };
  }
  return {
    ...base,
    state: 'choose' as const,
    people: invite.names
      .map((name, index) => ({
        index,
        name,
        initials: initialsOf(name),
        colour: colourFor(name.toLowerCase()),
        chosen: index === me,
      }))
      .filter((p) => p.index !== invite.from),
    choose: setMe,
    canJoin: me !== null,
    join: () => {
      if (me === null) return;
      openMap(sessions.join(invite, me).id);
    },
  };
}
