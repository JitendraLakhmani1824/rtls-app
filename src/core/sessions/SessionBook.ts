import {
  EVENT_KINDS,
  MAX_FRIENDS,
  ME_KEY,
  type Circle,
  type EventKind,
  type Invite,
  type Person,
  type Profile,
  type SessionPerson,
  type SessionRecord,
} from '../models';
import type { Clock, Sessions, Storage } from '../protocols';
import { createStore, type Rng } from '../utils';
import { cleanName, cleanTitle, inviteUrl, newCode, parseInvite } from './invite';
import { sampleBook } from './sample';

const KEY = 'rtls.book';
/** v2 added the profile (photo, onboarded); v1 books are read too. */
const VERSION = 2;
const NO_PROFILE: Profile = { name: '', photo: null, onboarded: false };

type Saved = { v: number; profile: Profile; people: Person[]; sessions: SessionRecord[] };

export type SessionBookDeps = { storage: Storage; clock: Clock; rng: Rng };

/**
 * Your people and sessions, kept on the phone. Every change applies in memory at once and is saved
 * in the background, one save after another. Nothing here is on the location hot path.
 */
export class SessionBook implements Sessions {
  readonly loaded = createStore(false);
  readonly people = createStore<Person[]>([]);
  readonly list = createStore<SessionRecord[]>([]);
  readonly profile = createStore<Profile>(NO_PROFILE);
  private loading: Promise<void> | null = null;
  private saving: Promise<void> = Promise.resolve();

  constructor(private readonly deps: SessionBookDeps) {}

  /** Reads the saved book. Nothing saved (first launch) or unreadable data → the sample book. */
  load(): Promise<void> {
    this.loading ??= this.deps.storage.load(KEY).then((text) => {
      const saved = text === null ? null : readSaved(text);
      if (saved) {
        this.profile.set(saved.profile);
        this.people.set(saved.people);
        this.list.set(saved.sessions);
      } else {
        const sample = sampleBook(this.deps.rng, this.deps.clock.now());
        this.people.set(sample.people);
        this.list.set(sample.sessions);
        this.save();
      }
      this.loaded.set(true);
    });
    return this.loading;
  }

  /** Resolves once every change so far is saved. */
  saved(): Promise<void> {
    return this.saving;
  }

  get(id: string) {
    return this.list.get().find((s) => s.id === id);
  }

  create(input: { title: string; event: EventKind; people: string[] }): SessionRecord {
    const known = new Map(this.people.get().map((p) => [p.key, p]));
    const chosen = [...new Set(input.people)]
      .map((key) => known.get(key))
      .filter((p): p is Person => p !== undefined)
      .slice(0, MAX_FRIENDS);
    const record: SessionRecord = {
      id: this.freshCode(),
      title: cleanTitle(input.title) || 'Session',
      event: input.event,
      people: [
        { key: ME_KEY, name: this.profile.get().name },
        ...chosen.map((p) => ({ key: p.key, name: p.name })),
      ],
      createdAt: this.deps.clock.now(),
    };
    this.list.set([record, ...this.list.get()]);
    this.save();
    return record;
  }

  readInvite(parts: Partial<Record<'code' | 'e' | 't' | 'p' | 'f', string>>): Invite | null {
    return parseInvite(parts);
  }

  join(invite: Invite, as: number): SessionRecord {
    const existing = this.get(invite.code);
    if (existing) return existing;
    // No accounts without a server: people are matched by name.
    const people = [...this.people.get()];
    const byName = new Map(people.map((p) => [p.name.toLowerCase(), p]));
    const members: SessionPerson[] = invite.names.map((name, i) => {
      if (i === as) return { key: ME_KEY, name };
      let person = byName.get(name.toLowerCase());
      if (!person) {
        person = { key: this.freshKey(people), name, circle: 'friends' };
        people.push(person);
        byName.set(name.toLowerCase(), person);
      }
      return { key: person.key, name: person.name };
    });
    const record: SessionRecord = {
      id: invite.code,
      title: invite.title,
      event: invite.event,
      people: members,
      createdAt: this.deps.clock.now(),
    };
    // Joining from a link is a way in: you've said who you are, so there's no onboarding to do.
    const profile = this.profile.get();
    this.profile.set({
      ...profile,
      name: profile.name || (invite.names[as] ?? ''),
      onboarded: true,
    });
    this.people.set(people);
    this.list.set([record, ...this.list.get()]);
    this.save();
    return record;
  }

  remove(id: string) {
    const next = this.list.get().filter((s) => s.id !== id);
    if (next.length === this.list.get().length) return;
    this.list.set(next);
    this.save();
  }

  addPerson(name: string, circle: Circle): Person {
    const people = this.people.get();
    const person: Person = {
      key: this.freshKey(people),
      name: cleanName(name) || 'Friend',
      circle,
    };
    this.people.set([...people, person]);
    this.save();
    return person;
  }

  updateProfile(change: Partial<Profile>) {
    const prev = this.profile.get();
    const next: Profile = {
      name: change.name === undefined ? prev.name : cleanName(change.name),
      photo: change.photo === undefined ? prev.photo : change.photo,
      onboarded: change.onboarded ?? prev.onboarded,
    };
    if (next.name === prev.name && next.photo === prev.photo && next.onboarded === prev.onboarded)
      return;
    this.profile.set(next);
    this.save();
  }

  inviteUrl(id: string): string {
    const record = this.get(id);
    return record ? inviteUrl(record, this.profile.get().name) : '';
  }

  private freshCode(): string {
    let code = newCode(this.deps.rng);
    while (this.get(code)) code = newCode(this.deps.rng);
    return code;
  }

  private freshKey(people: readonly Person[]): string {
    let key = `p${newCode(this.deps.rng, 8).toLowerCase()}`;
    while (key === ME_KEY || people.some((p) => p.key === key))
      key = `p${newCode(this.deps.rng, 8).toLowerCase()}`;
    return key;
  }

  private save() {
    const saved: Saved = {
      v: VERSION,
      profile: this.profile.get(),
      people: this.people.get(),
      sessions: this.list.get(),
    };
    const text = JSON.stringify(saved);
    this.saving = this.saving.then(() => this.deps.storage.save(KEY, text)).catch(() => {});
  }
}

/** The saved book, or null if it isn't one. Entries that don't make sense are dropped one by one. */
function readSaved(text: string): Saved | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data) || (data.v !== 1 && data.v !== VERSION)) return null;
  if (!Array.isArray(data.people) || !Array.isArray(data.sessions)) return null;
  return {
    v: VERSION,
    profile: readProfile(data),
    people: data.people.filter(isPerson),
    sessions: data.sessions.filter(isSession),
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const isPerson = (v: unknown): v is Person =>
  isObject(v) &&
  typeof v.key === 'string' &&
  v.key !== ME_KEY &&
  typeof v.name === 'string' &&
  (v.circle === 'family' || v.circle === 'friends');

const isSession = (v: unknown): v is SessionRecord =>
  isObject(v) &&
  typeof v.id === 'string' &&
  typeof v.title === 'string' &&
  typeof v.createdAt === 'number' &&
  EVENT_KINDS.some((e) => e === v.event) &&
  Array.isArray(v.people) &&
  v.people.length >= 1 &&
  v.people.every((p) => isObject(p) && typeof p.key === 'string' && typeof p.name === 'string') &&
  v.people.filter((p) => isObject(p) && p.key === ME_KEY).length === 1;

/** v2 keeps a profile; v1 kept only your name (and had no onboarding). */
function readProfile(data: Record<string, unknown>): Profile {
  const p = isObject(data.profile) ? data.profile : {};
  const name =
    typeof p.name === 'string' ? p.name : typeof data.myName === 'string' ? data.myName : '';
  return {
    name: cleanName(name),
    photo: typeof p.photo === 'string' ? p.photo : null,
    onboarded: p.onboarded === true,
  };
}
