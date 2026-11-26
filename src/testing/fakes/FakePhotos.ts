import type { Photos } from '@core/protocols';

/** Photos for screen tests: set what the next pick returns; it records what screens ask of it. */
export class FakePhotos implements Photos {
  /** What the next pick resolves to (null = the user cancelled). */
  next: string | null = 'file:///photos/1.jpg';
  readonly calls: string[] = [];

  async pick(from: 'library' | 'camera') {
    this.calls.push(`pick ${from}`);
    return this.next;
  }

  async remove(uri: string) {
    this.calls.push(`remove ${uri}`);
  }
}
