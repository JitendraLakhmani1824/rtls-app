import { useManagers, usePeople } from '@common/di';
import type { RootStack } from '@common/navigation';
import { EVENTS } from '@common/ui';
import { EVENT_KINDS, MAX_FRIENDS, type Circle, type EventKind, type Person } from '@core/models';
import { colourFor, initialsOf } from '@core/utils';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';

export type PickPerson = {
  key: string;
  name: string;
  initials: string;
  colour: string;
  chosen: boolean;
};
export type PickCircle = {
  circle: Circle;
  title: string;
  people: PickPerson[];
  allChosen: boolean;
};

const CIRCLES: { circle: Circle; title: string }[] = [
  { circle: 'family', title: 'Family' },
  { circle: 'friends', title: 'Friends' },
];

/** Starting a session: what's happening, its name, and who's coming. Starting opens its map. */
export function useNewSession() {
  const { sessions } = useManagers();
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const preselect = useRoute<RouteProp<RootStack, 'NewSession'>>().params?.with;
  const people = usePeople();
  const [event, setEvent] = useState<EventKind>('concert');
  const [title, setTitle] = useState('');
  const [chosen, setChosen] = useState<ReadonlySet<string>>(
    () => new Set(preselect ? [preselect] : []),
  );

  const change = (keys: string[], on: boolean) =>
    setChosen((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (!on) next.delete(key);
        else if (next.size < MAX_FRIENDS) next.add(key);
      }
      return next;
    });

  const circles: PickCircle[] = CIRCLES.map(({ circle, title: name }) => {
    const members = people.filter((p) => p.circle === circle).map((p) => pick(p, chosen));
    return {
      circle,
      title: name,
      people: members,
      allChosen: members.length > 0 && members.every((p) => p.chosen),
    };
  }).filter((c) => c.people.length > 0);

  const placeholder = EVENTS[event].defaultTitle;
  return {
    events: EVENT_KINDS.map((kind) => ({ kind, ...EVENTS[kind], on: kind === event })),
    setEvent,
    title,
    setTitle,
    placeholder,
    circles,
    toggle: (key: string) => change([key], !chosen.has(key)),
    toggleCircle: (circle: PickCircle) =>
      change(
        circle.people.map((p) => p.key),
        !circle.allChosen,
      ),
    count: chosen.size,
    full: chosen.size >= MAX_FRIENDS,
    max: MAX_FRIENDS,
    canStart: chosen.size > 0,
    start: () => {
      if (chosen.size === 0) return;
      const record = sessions.create({
        title: title.trim() || placeholder,
        event,
        people: [...chosen],
      });
      navigation.replace('SessionMap', { id: record.id });
    },
    close: () => navigation.goBack(),
  };
}

const pick = (person: Person, chosen: ReadonlySet<string>): PickPerson => ({
  key: person.key,
  name: person.name,
  initials: initialsOf(person.name),
  colour: colourFor(person.key),
  chosen: chosen.has(person.key),
});
