import { clockContract } from '../contracts';
import { FakeClock } from './FakeClock';

clockContract('FakeClock', () => {
  const clock = new FakeClock();
  return { clock, advance: (ms) => clock.advance(ms) };
});
