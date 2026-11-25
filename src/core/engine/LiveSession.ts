import type { ConnState, Cursor, FixBatch, Member } from '../models';
import type {
  DeviceManager,
  FeedHandle,
  FeedManager,
  FeedSink,
  MapManager,
  Perf,
  Session,
  Stop,
} from '../protocols';
import { createStore } from '../utils';
import { GlidePlanner } from './glide';
import { LocationStore } from './store';

export type LiveSessionDeps = {
  feed: FeedManager;
  map: MapManager;
  device: DeviceManager;
  perf: Perf;
  /** Most members gliding at once (the rest are redrawn ≤ 1×/s). */
  glideLimit?: number;
};

const TICK_MS = 1000;

/**
 * The controller. The only code that starts or stops anything.
 * Running = app in the foreground AND map ready. Otherwise paused: no feed, no ticks, nothing drawn.
 * Navigation focus is deliberately ignored (a sheet over the map must not pause it).
 */
export class LiveSession implements Session {
  readonly selected = createStore<number | null>(null);
  readonly connection = createStore<ConnState>({ kind: 'reconnecting', sinceMs: 0 });

  private readonly store = new LocationStore();
  private readonly planner: GlidePlanner;
  private readonly changed: number[] = [];
  private members: Member[] = [];
  private handle: FeedHandle | null = null;
  private cursor: Cursor | undefined;
  private stopTick: Stop | null = null;
  private stillDirty = false;

  constructor(private readonly deps: LiveSessionDeps) {
    this.planner = new GlidePlanner(deps.glideLimit ?? 30);
  }

  /** Starts following foreground/map state. Returns stop(); start() may be called again afterwards. */
  start(): Stop {
    const { device, map } = this.deps;
    const update = () => (device.foreground.get() && map.ready.get() ? this.run() : this.pause());
    const subscriptions = [
      device.foreground.subscribe(update),
      map.ready.subscribe(update),
      map.onPinPress((member) => this.select(member)),
    ];
    update();
    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
      this.pause();
    };
  }

  get running() {
    return this.handle !== null;
  }

  select(member: number | null) {
    this.selected.set(member);
    this.deps.map.setSelected(member);
    if (this.planner.update(this.store, member)) this.sendMoving();
    this.stillDirty = true;
  }

  private run() {
    if (this.handle) return;
    this.handle = this.deps.feed.start(this.sink, this.cursor);
    this.stopTick = this.deps.device.clock.every(TICK_MS, this.tick);
    this.resendAll(); // the map may have been recreated while paused
  }

  private pause() {
    if (!this.handle) return;
    this.cursor = this.handle.cursor();
    this.handle.stop();
    this.handle = null;
    this.stopTick?.();
    this.stopTick = null;
  }

  private readonly sink: FeedSink = {
    onMembers: (members) => {
      this.members = members;
      this.store.reset(members.length);
      this.deps.map.setMembers(members);
    },
    onFixes: (batch) => this.ingest(batch),
    onState: (state) => this.connection.set(state),
    onSessionEnded: () => this.pause(),
  };

  private ingest(batch: FixBatch) {
    const { perf } = this.deps;
    const changed = perf.measure('ingest', () => this.store.ingest(batch, this.changed));
    perf.count('fixes', batch.n);
    if (changed === 0) return;
    const setChanged = perf.measure('plan', () =>
      this.planner.update(this.store, this.selected.get()),
    );
    let glidingMoved = setChanged;
    for (const m of this.changed) {
      if (this.planner.isGliding(m)) glidingMoved = true;
      else this.stillDirty = true;
    }
    if (setChanged) this.stillDirty = true;
    if (glidingMoved) this.sendMoving();
  }

  private readonly tick = () => {
    if (!this.stillDirty) return;
    this.stillDirty = false;
    this.sendStill();
  };

  private sendMoving() {
    const frame = this.deps.perf.measure('motionFrame', () => this.planner.motionFrame(this.store));
    this.deps.map.setMoving(frame);
    this.deps.perf.count('movingFrames');
  }

  private sendStill() {
    const frame = this.deps.perf.measure('stillFrame', () => this.planner.stillFrame(this.store));
    this.deps.map.setStill(frame);
    this.deps.perf.count('stillFrames');
  }

  private resendAll() {
    if (this.members.length === 0) return;
    this.deps.map.setMembers(this.members);
    this.deps.map.setSelected(this.selected.get());
    this.sendStill();
    this.sendMoving();
  }
}
