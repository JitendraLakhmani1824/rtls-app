import type { Storage } from '@core/protocols';

/** The promises every Storage keeps. Run it for each implementation: `storageContract('MemoryStorage', make)`. */
export function storageContract(name: string, make: () => Storage) {
  describe(`${name} keeps the Storage contract`, () => {
    it('reads back what it saved', async () => {
      const storage = make();
      await storage.save('book', '{"v":1}');
      expect(await storage.load('book')).toBe('{"v":1}');
    });

    it('reads null for a key never saved', async () => {
      expect(await make().load('never')).toBeNull();
    });

    it('keeps only the latest save of a key', async () => {
      const storage = make();
      await storage.save('book', 'first');
      await storage.save('book', 'second');
      expect(await storage.load('book')).toBe('second');
    });
  });
}
