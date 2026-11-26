import { ME_KEY } from '@core/models';
import { createRng } from '@core/utils';
import { FakeClock, MemoryStorage } from '@testing/fakes';

import { invitePartsOf, parseInvite } from './invite';
import { SessionBook } from './SessionBook';

async function setup(storage = new MemoryStorage()) {
  const book = new SessionBook({ storage, clock: new FakeClock(), rng: createRng(7) });
  await book.load();
  return { book, storage };
}

describe('SessionBook', () => {
  it('starts a first launch with family, friends and one session of each kind', async () => {
    const { book, storage } = await setup();
    expect(book.loaded.get()).toBe(true);
    expect(book.people.get().map((p) => p.circle)).toContain('family');
    expect(book.list.get().map((s) => s.event)).toEqual(['trip', 'marathon', 'concert']);
    await book.saved();
    expect(storage.saves).toBe(1);
  });

  it('starts a session with you first and the chosen people, newest first', async () => {
    const { book } = await setup();
    const record = book.create({ title: '  Beach day ', event: 'trip', people: ['mom', 'riya'] });
    expect(record.id).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(record.title).toBe('Beach day');
    expect(record.people.map((p) => p.key)).toEqual([ME_KEY, 'mom', 'riya']);
    expect(book.list.get()[0]).toBe(record);
  });

  it('ignores people it doesn’t know and repeats', async () => {
    const { book } = await setup();
    const record = book.create({ title: 'x', event: 'concert', people: ['dev', 'nobody', 'dev'] });
    expect(record.people.map((p) => p.key)).toEqual([ME_KEY, 'dev']);
  });

  it('keeps everything after a restart', async () => {
    const { book, storage } = await setup();
    const record = book.create({ title: 'Beach day', event: 'trip', people: ['dad'] });
    book.setMyName('Asha');
    book.addPerson('Sam', 'friends');
    await book.saved();
    const { book: again } = await setup(storage);
    expect(again.get(record.id)).toEqual(record);
    expect(again.myName.get()).toBe('Asha');
    expect(again.people.get().map((p) => p.name)).toContain('Sam');
  });

  it('falls back to the sample book when the saved data is unreadable', async () => {
    const storage = new MemoryStorage();
    storage.data.set('rtls.book', '{not json');
    const { book } = await setup(storage);
    expect(book.list.get()).toHaveLength(3);
  });

  it('drops saved entries that don’t make sense and keeps the rest', async () => {
    const { book, storage } = await setup();
    await book.saved();
    const saved = JSON.parse(storage.data.get('rtls.book') ?? '');
    saved.sessions.push({ id: 'BROKEN', event: 'party' });
    saved.people.push({ key: 'x' });
    storage.data.set('rtls.book', JSON.stringify(saved));
    const { book: again } = await setup(storage);
    expect(again.list.get()).toHaveLength(3);
    expect(again.people.get()).toHaveLength(book.people.get().length);
  });

  it('keeps working in memory when the phone can’t save', async () => {
    const storage = new MemoryStorage();
    storage.failing = true;
    const { book } = await setup(storage);
    book.create({ title: 'x', event: 'trip', people: ['mom'] });
    await book.saved();
    expect(book.list.get()).toHaveLength(4);
  });

  describe('joining from a link', () => {
    const link = 'rtls://join/K7Q2XP?e=marathon&t=Run&p=Riya,Asha,Sam&f=0';
    const invite = () => parseInvite(invitePartsOf(link) ?? {});

    it('joins as the chosen person, matching people by name and adding the rest to friends', async () => {
      const { book } = await setup();
      const record = book.join(invite()!, 1);
      expect(record.id).toBe('K7Q2XP');
      expect(record.people.map((p) => p.key)).toEqual(['riya', ME_KEY, expect.any(String)]);
      expect(record.people[1]?.name).toBe('Asha');
      const sam = book.people.get().find((p) => p.name === 'Sam');
      expect(sam).toMatchObject({ circle: 'friends', key: record.people[2]?.key });
      expect(book.myName.get()).toBe('Asha'); // you hadn't set a name yet
    });

    it('opens the same session when joining twice', async () => {
      const { book } = await setup();
      const first = book.join(invite()!, 1);
      expect(book.join(invite()!, 2)).toBe(first);
      expect(book.list.get().filter((s) => s.id === 'K7Q2XP')).toHaveLength(1);
    });

    it('invites onward with your name in your place, keeping everyone’s order', async () => {
      const { book } = await setup();
      book.join(invite()!, 1);
      expect(book.inviteUrl('K7Q2XP')).toBe(
        'rtls://join/K7Q2XP?e=marathon&t=Run&p=Riya,Asha,Sam&f=1',
      );
    });
  });

  it('removes a session you leave', async () => {
    const { book } = await setup();
    const id = book.list.get()[0]?.id ?? '';
    book.remove(id);
    expect(book.get(id)).toBeUndefined();
    expect(book.list.get()).toHaveLength(2);
  });
});
