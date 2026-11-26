import { ME_KEY, type Person, type SessionRecord } from '../models';
import type { Rng } from '../utils';
import { newCode } from './invite';

const FAMILY = ['Mom', 'Dad', 'Didi', 'Rohan', 'Nani'];
const FRIENDS = ['Riya', 'Arjun', 'Kabir', 'Meera', 'Zoya', 'Dev', 'Ananya', 'Ishaan', 'Tara'];
/** A running club big enough to show grouping: you and 149 runners (not added to your people). */
const CLUB_SIZE = 149;
const CLUB_FIRST = [
  'Aarav',
  'Aditi',
  'Akash',
  'Anika',
  'Arnav',
  'Avni',
  'Dhruv',
  'Diya',
  'Farhan',
  'Gauri',
  'Harsh',
  'Isha',
  'Jay',
  'Kavya',
  'Kiran',
  'Lakshmi',
  'Manav',
  'Mira',
  'Neel',
  'Nisha',
  'Om',
  'Pooja',
  'Pranav',
  'Priya',
  'Rahul',
  'Rhea',
  'Rohit',
  'Saanvi',
  'Sahil',
  'Sana',
  'Shreya',
  'Siddharth',
  'Sneha',
  'Tanvi',
  'Tejas',
  'Uma',
  'Varun',
  'Vedika',
  'Vihaan',
  'Yash',
  'Zara',
  'Aditya',
  'Bhavna',
  'Chetan',
  'Esha',
  'Gaurav',
  'Ira',
  'Kunal',
  'Leela',
  'Nikhil',
];
const LETTERS = 'ABCDEGHJKLMNPRSTVY';

/** The first-launch book: family and friends, and one session of each kind, so the app is never empty. */
export function sampleBook(rng: Rng, now: number): { people: Person[]; sessions: SessionRecord[] } {
  const people: Person[] = [
    ...FAMILY.map((name) => ({ key: name.toLowerCase(), name, circle: 'family' as const })),
    ...FRIENDS.map((name) => ({ key: name.toLowerCase(), name, circle: 'friends' as const })),
  ];
  const session = (
    title: string,
    event: SessionRecord['event'],
    names: string[],
    minutesAgo: number,
  ): SessionRecord => ({
    id: newCode(rng),
    title,
    event,
    people: [
      { key: ME_KEY, name: '' },
      ...names.map((name) => ({ key: name.toLowerCase(), name })),
    ],
    createdAt: now - minutesAgo * 60_000,
  });
  const club: SessionRecord = {
    id: newCode(rng),
    title: 'Marathon running club',
    event: 'marathon',
    people: [
      { key: ME_KEY, name: '' },
      ...Array.from({ length: CLUB_SIZE }, (_, i) => ({
        key: `club-${i + 1}`,
        name: `${CLUB_FIRST[i % CLUB_FIRST.length]} ${LETTERS[(i * 7) % LETTERS.length]}.`,
      })),
    ],
    createdAt: now - 20 * 60_000,
  };
  return {
    people,
    sessions: [
      session('Road trip with family', 'trip', ['Mom', 'Dad', 'Didi', 'Rohan'], 5),
      club,
      session('Sunday marathon', 'marathon', ['Arjun', 'Kabir', 'Meera', 'Dev', 'Tara'], 60),
      session('Concert night', 'concert', ['Riya', 'Zoya', 'Ananya', 'Ishaan'], 180),
    ],
  };
}
